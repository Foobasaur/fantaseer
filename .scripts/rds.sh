#!/usr/bin/env bash
set -euo pipefail

# Usage: bash .scripts/rds.sh <stage>
# Example: bash .scripts/rds.sh eze
#          bash .scripts/rds.sh test

STAGE="${1:-}"
if [[ -z "$STAGE" ]]; then
  echo "Usage: $0 <stage>" >&2
  echo "  e.g. $0 eze" >&2
  echo "  e.g. $0 test" >&2
  exit 1
fi

REGION="${AWS_REGION:-us-east-1}"
LOCAL_PORT="${LOCAL_PORT:-5963}"
REMOTE_PORT="5432"
KEY_PATH="/tmp/vpc-key.pem"
export AWS_PROFILE="${AWS_PROFILE:-exe}"

# AWS profile + SSO auto-login
if ! aws sts get-caller-identity &>/dev/null; then
  echo "SSO session expired or missing for profile '$AWS_PROFILE' — logging in..."
  aws sso login || {
    echo "  Browser launch failed (common in WSL). Retrying with device code..." >&2
    aws sso login --use-device-code
  }
fi

echo "=== RDS Tunnel via SSH [stage: $STAGE] ==="
echo ""

# 1. Find RDS Proxy for this stage → endpoint + VPC ID
echo "[1/6] Finding RDS Proxy for stage '$STAGE'..."
PROXY_JSON=$(aws rds describe-db-proxies \
  --region "$REGION" \
  --query "DBProxies[?contains(DBProxyName,'$STAGE')] | [0].{Endpoint:Endpoint,VpcId:VpcId}" \
  --output json)

RDS_ENDPOINT=$(echo "$PROXY_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['Endpoint'])")
VPC_ID=$(echo "$PROXY_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['VpcId'])")

if [[ -z "$RDS_ENDPOINT" || "$RDS_ENDPOINT" == "None" ]]; then
  echo "ERROR: No RDS Proxy found for stage '$STAGE'" >&2
  exit 1
fi
echo "  Endpoint: $RDS_ENDPOINT"
echo "  VPC: $VPC_ID"

# 2. Find NAT instance in the SAME VPC
echo "[2/6] Finding NAT instance in $VPC_ID..."
NAT_IP=$(aws ec2 describe-instances \
  --region "$REGION" \
  --filters \
    "Name=tag:Name,Values=*NAT*" \
    "Name=instance-state-name,Values=running" \
    "Name=vpc-id,Values=$VPC_ID" \
  --query "Reservations[0].Instances[0].PublicIpAddress" \
  --output text)

if [[ "$NAT_IP" == "None" || -z "$NAT_IP" ]]; then
  echo "ERROR: No running NAT instance in VPC $VPC_ID" >&2
  exit 1
fi
echo "  NAT IP: $NAT_IP"

# 3. Get VPC SSH key from SSM (keyed by VPC ID)
echo "[3/6] Fetching SSH key for $VPC_ID..."
VPC_PARAM="/sst/vpc/${VPC_ID}/private-key-value"

rm -f "$KEY_PATH"
aws ssm get-parameter \
  --name "$VPC_PARAM" \
  --with-decryption \
  --region "$REGION" \
  --query Parameter.Value \
  --output text > "$KEY_PATH"
chmod 400 "$KEY_PATH"

if [[ ! -s "$KEY_PATH" ]]; then
  echo "ERROR: SSH key file is empty (param: $VPC_PARAM)" >&2
  exit 1
fi
echo "  Key: $VPC_PARAM"

# 4. Get credentials from Secrets Manager (filtered by stage)
echo "[4/6] Fetching DB credentials..."
SECRET_NAME=$(aws secretsmanager list-secrets \
  --region "$REGION" \
  --query "SecretList[?contains(Name,'$STAGE') && contains(Name,'Proxy')].Name | [0]" \
  --output text)

if [[ "$SECRET_NAME" == "None" || -z "$SECRET_NAME" ]]; then
  echo "ERROR: No Postgres secret found for stage '$STAGE'" >&2
  exit 1
fi

SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" \
  --region "$REGION" \
  --query SecretString \
  --output text)

DB_USER=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['username'])")
DB_PASS=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['password'])")
echo "  User: $DB_USER"
echo "  Secret: $SECRET_NAME"

# 5. Get DB name (filtered by stage)
echo "[5/6] Getting DB name..."
DB_NAME=$(aws rds describe-db-instances \
  --region "$REGION" \
  --query "DBInstances[?contains(DBInstanceIdentifier,'$STAGE')].DBName | [0]" \
  --output text)

if [[ "$DB_NAME" == "None" || -z "$DB_NAME" ]]; then
  DB_NAME=$(aws rds describe-db-instances \
    --region "$REGION" \
    --query "DBInstances[0].DBName" \
    --output text)
fi
echo "  DB: $DB_NAME"

# 6. Check for existing tunnel
echo "[6/6] Checking for existing tunnel..."
if lsof -i :"$LOCAL_PORT" &>/dev/null 2>&1; then
  echo "  WARNING: Port $LOCAL_PORT already in use"
  lsof -i :"$LOCAL_PORT" | head -3
  echo ""
  read -rp "  Kill existing process? [y/N] " kill_choice
  if [[ "$kill_choice" =~ ^[Yy]$ ]]; then
    fuser -k "$LOCAL_PORT"/tcp 2>/dev/null || true
    sleep 1
  else
    echo "  Aborting." >&2
    exit 1
  fi
fi

DATABASE_URL="postgres://${DB_USER}:${DB_PASS}@localhost:${LOCAL_PORT}/${DB_NAME}"

echo ""
echo "=== Ready [stage: $STAGE] ==="
echo ""
echo "DATABASE_URL=$DATABASE_URL"
echo ""
echo "Commands (run in separate terminals):"
echo ""
echo "  # Drizzle Studio"
echo "  DATABASE_URL=\"$DATABASE_URL\" npx drizzle-kit studio --config=drizzle.local.ts"
echo ""
echo "  # Drizzle Push"
echo "  DATABASE_URL=\"$DATABASE_URL\" npx drizzle-kit push --config=drizzle.local.ts"
echo ""
echo "  # Drizzle Migrate"
echo "  DATABASE_URL=\"$DATABASE_URL\" npx drizzle-kit migrate --config=drizzle.local.ts"
echo ""
echo "  # Kill tunnel"
echo "  pkill -f \"session-manager-plugin\""
echo ""

read -rp "Start SSH tunnel now? [Y/n] " choice
choice="${choice:-Y}"

if [[ "$choice" =~ ^[Yy]$ ]]; then
  echo ""
  echo "Starting tunnel: localhost:$LOCAL_PORT -> $RDS_ENDPOINT:$REMOTE_PORT"
  echo "Via: ec2-user@$NAT_IP (VPC: $VPC_ID)"
  echo "Press Ctrl+C to close."
  echo ""
  ssh -L "${LOCAL_PORT}:${RDS_ENDPOINT}:${REMOTE_PORT}" \
    "ec2-user@${NAT_IP}" \
    -i "$KEY_PATH" \
    -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=60 \
    -o ExitOnForwardFailure=yes \
    -N
fi