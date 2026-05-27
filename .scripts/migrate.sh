#!/usr/bin/env bash
set -euo pipefail

# ─── Invoke Migrate Lambda ───────────────────────────────────────────────────
#
# Finds the deployed `Migrate` Lambda for the given stage and invokes it
# synchronously, streaming the tail of its CloudWatch logs back to your terminal.
#
# USAGE:
#   bash .scripts/migrate.sh <stage>
#
# EXAMPLES:
#   bash .scripts/migrate.sh pre
#   bash .scripts/migrate.sh eze
#
# ENV OVERRIDES:
#   AWS_PROFILE  default: exe  (auto-runs `aws sso login` if expired)
#   AWS_REGION   default: us-east-1
#
# ─────────────────────────────────────────────────────────────────────────────

STAGE="${1:-}"
if [[ -z "$STAGE" ]]; then
  echo "Usage: $0 <stage>" >&2
  echo "  e.g. $0 pre" >&2
  exit 1
fi

REGION="${AWS_REGION:-us-east-1}"
export AWS_PROFILE="${AWS_PROFILE:-exe}"

# AWS profile + SSO auto-login
if ! aws sts get-caller-identity &>/dev/null; then
  echo "SSO session expired or missing for profile '$AWS_PROFILE' — logging in..."
  aws sso login || {
    echo "  Browser launch failed (common in WSL). Retrying with device code..." >&2
    aws sso login --use-device-code
  }
fi

echo "=== Invoke Migrate [stage: $STAGE] ==="
echo ""

# 1. Find the Migrate function
echo "[1/2] Finding Migrate Lambda for stage '$STAGE'..."
NAME=$(aws lambda list-functions --region "$REGION" \
  --query "Functions[?contains(FunctionName,'$STAGE') && contains(FunctionName,'Migrate')].FunctionName | [0]" \
  --output text)

if [[ -z "$NAME" || "$NAME" == "None" ]]; then
  echo "ERROR: No Migrate function found for stage '$STAGE'" >&2
  echo "  All functions matching '$STAGE':" >&2
  aws lambda list-functions --region "$REGION" \
    --query "Functions[?contains(FunctionName,'$STAGE')].FunctionName" \
    --output text >&2
  exit 1
fi
echo "  Function: $NAME"
echo ""

# 2. Confirm + invoke
read -rp "[2/2] Invoke '$NAME'? [Y/n] " choice
choice="${choice:-Y}"

if [[ ! "$choice" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Invoking..."
echo ""

OUT=$(mktemp)
trap 'rm -f "$OUT"' EXIT

aws lambda invoke \
  --function-name "$NAME" \
  --region "$REGION" \
  --log-type Tail \
  --query LogResult --output text \
  "$OUT" | base64 -d

echo ""
echo "─── Function response ───"
cat "$OUT"
echo ""
echo ""
echo "Full logs (if truncated above):"
echo "  aws logs tail \"/aws/lambda/$NAME\" --follow --since 5m --region $REGION"