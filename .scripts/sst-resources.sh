#!/usr/bin/env bash
# Usage:
#   ./sst-resources.sh                          # ALL sst-tagged resources (any app)
#   ./sst-resources.sh fantaseer-sveltekit      # specific app
#   ./sst-resources.sh aws-svelte-sst us-east-2 # specific app + region
#   AWS_REGION=eu-west-1 ./sst-resources.sh     # region via env
set -uo pipefail

APP="${1:-}"
REGION="${2:-${AWS_REGION:-us-east-1}}"

if [[ -z "$APP" || "$APP" == "*" || "$APP" == "all" ]]; then
  MODE="all"
  # JSON form because CLI shorthand requires Values
  RGT_FILTER_JSON='[{"Key":"sst:app"}]'
  # EC2 special filter: match resources that have the key, any value
  EC2_FILTER="Name=tag-key,Values=sst:app"
  HEADER_APP="<any>"
else
  MODE="specific"
  RGT_FILTER_JSON="[{\"Key\":\"sst:app\",\"Values\":[\"$APP\"]}]"
  EC2_FILTER="Name=tag:sst:app,Values=$APP"
  HEADER_APP="$APP"
fi

section() { printf '\n=== %s ===\n' "$1"; }

# Runs the command without eval. On non-zero exit, prints the AWS error (truncated)
# so real bugs are visible. On empty output, prints a marker so empty != broken.
run() {
  local out err rc
  out="$("$@" 2>/tmp/sst-resources.err)"
  rc=$?
  err="$(cat /tmp/sst-resources.err)"
  if (( rc != 0 )); then
    # Strip newlines from error for one-line display
    echo "  ERROR: $(echo "$err" | tr '\n' ' ' | head -c 300)"
    return
  fi
  if [[ -z "$out" || "$out" == "[]" || "$out" == "null" ]]; then
    echo "  (none)"
    return
  fi
  echo "$out"
}

echo "Scanning region=$REGION  mode=$MODE  app=$HEADER_APP"
echo "Account: $(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo unknown)"

section "Resource Groups Tagging API (catch-all)"
run aws resourcegroupstaggingapi get-resources \
  --tag-filters "$RGT_FILTER_JSON" \
  --region "$REGION" \
  --query "ResourceTagMappingList[].[ResourceARN, Tags[?Key=='sst:app'].Value|[0], Tags[?Key=='sst:stage'].Value|[0]]" \
  --output table

# ────────────────────────────────────────────────────────────
# Tag-aware service queries (work in both modes)
# ────────────────────────────────────────────────────────────

section "EC2 instances (any state, incl. terminated)"
run aws ec2 describe-instances --region "$REGION" --filters "$EC2_FILTER" \
  --query "Reservations[].Instances[].[InstanceId,State.Name,InstanceType,Tags[?Key=='sst:app'].Value|[0],Tags[?Key=='Name'].Value|[0]]" \
  --output table

section "EBS volumes"
run aws ec2 describe-volumes --region "$REGION" --filters "$EC2_FILTER" \
  --query "Volumes[].[VolumeId,State,Size,Tags[?Key=='sst:app'].Value|[0],Attachments[0].InstanceId]" \
  --output table

section "Network interfaces (ENIs)"
run aws ec2 describe-network-interfaces --region "$REGION" --filters "$EC2_FILTER" \
  --query "NetworkInterfaces[].[NetworkInterfaceId,Status,TagSet[?Key=='sst:app'].Value|[0],Description,VpcId]" \
  --output table

section "Security groups"
run aws ec2 describe-security-groups --region "$REGION" --filters "$EC2_FILTER" \
  --query "SecurityGroups[].[GroupId,GroupName,VpcId,Tags[?Key=='sst:app'].Value|[0]]" --output table

section "Elastic IPs"
run aws ec2 describe-addresses --region "$REGION" --filters "$EC2_FILTER" \
  --query "Addresses[].[AllocationId,PublicIp,InstanceId,Tags[?Key=='sst:app'].Value|[0],AssociationId]" \
  --output table

section "VPCs"
run aws ec2 describe-vpcs --region "$REGION" --filters "$EC2_FILTER" \
  --query "Vpcs[].[VpcId,State,CidrBlock,Tags[?Key=='sst:app'].Value|[0]]" --output table

section "Subnets"
run aws ec2 describe-subnets --region "$REGION" --filters "$EC2_FILTER" \
  --query "Subnets[].[SubnetId,VpcId,CidrBlock,State,Tags[?Key=='sst:app'].Value|[0]]" --output table

section "NAT gateways"
run aws ec2 describe-nat-gateways --region "$REGION" --filter "$EC2_FILTER" \
  --query "NatGateways[].[NatGatewayId,State,VpcId,Tags[?Key=='sst:app'].Value|[0]]" --output table

section "Internet gateways"
run aws ec2 describe-internet-gateways --region "$REGION" --filters "$EC2_FILTER" \
  --query "InternetGateways[].[InternetGatewayId,Attachments[0].VpcId,Tags[?Key=='sst:app'].Value|[0]]" --output table

section "Route tables"
run aws ec2 describe-route-tables --region "$REGION" --filters "$EC2_FILTER" \
  --query "RouteTables[].[RouteTableId,VpcId,Tags[?Key=='sst:app'].Value|[0]]" --output table

section "Key pairs"
run aws ec2 describe-key-pairs --region "$REGION" --filters "$EC2_FILTER" \
  --query "KeyPairs[].[KeyName,KeyPairId,Tags[?Key=='sst:app'].Value|[0]]" --output table

section "Secrets Manager (incl. scheduled-for-deletion)"
if [[ "$MODE" == "all" ]]; then
  run aws secretsmanager list-secrets --region "$REGION" --include-planned-deletion \
    --filters "Key=tag-key,Values=sst:app" \
    --query "SecretList[].[Name,DeletedDate,Tags[?Key=='sst:app'].Value|[0]]" --output table
else
  run aws secretsmanager list-secrets --region "$REGION" --include-planned-deletion \
    --filters "Key=tag-key,Values=sst:app" "Key=tag-value,Values=$APP" \
    --query "SecretList[].[Name,DeletedDate]" --output table
fi

# ────────────────────────────────────────────────────────────
# Name-match fallbacks (only meaningful for specific app)
# ────────────────────────────────────────────────────────────

if [[ "$MODE" == "specific" ]]; then
  section "RDS instances (name-match)"
  run aws rds describe-db-instances --region "$REGION" \
    --query "DBInstances[?contains(DBInstanceIdentifier,'$APP')].[DBInstanceIdentifier,DBInstanceStatus]" --output table

  section "RDS clusters (name-match)"
  run aws rds describe-db-clusters --region "$REGION" \
    --query "DBClusters[?contains(DBClusterIdentifier,'$APP')].[DBClusterIdentifier,Status]" --output table

  section "RDS proxies (name-match)"
  run aws rds describe-db-proxies --region "$REGION" \
    --query "DBProxies[?contains(DBProxyName,'$APP')].[DBProxyName,Status]" --output table

  section "RDS subnet groups (name-match)"
  run aws rds describe-db-subnet-groups --region "$REGION" \
    --query "DBSubnetGroups[?contains(DBSubnetGroupName,'$APP')].[DBSubnetGroupName,SubnetGroupStatus]" --output table

  section "Lambda functions (name-match)"
  run aws lambda list-functions --region "$REGION" \
    --query "Functions[?contains(FunctionName,'$APP')].[FunctionName,Runtime,LastModified]" --output table

  section "S3 buckets (name-match, global)"
  run aws s3api list-buckets \
    --query "Buckets[?contains(Name,'$APP')].[Name,CreationDate]" --output table

  section "CloudFront distributions (name-match, global)"
  run aws cloudfront list-distributions \
    --query "DistributionList.Items[?contains(to_string(Origins),'$APP') || contains(to_string(Aliases),'$APP')].[Id,DomainName,Status,Enabled]" \
    --output table

  section "CloudWatch log groups - Lambda"
  run aws logs describe-log-groups --region "$REGION" \
    --log-group-name-prefix "/aws/lambda/$APP" \
    --query "logGroups[].logGroupName" --output text

  section "CloudWatch log groups - RDS"
  run aws logs describe-log-groups --region "$REGION" \
    --log-group-name-prefix "/aws/rds/instance/$APP" \
    --query "logGroups[].logGroupName" --output text

  section "IAM roles (name-match)"
  run aws iam list-roles \
    --query "Roles[?contains(RoleName,'$APP')].[RoleName]" --output text

  section "SSM parameters (name-match)"
  run aws ssm describe-parameters --region "$REGION" \
    --parameter-filters "Key=Name,Option=Contains,Values=$APP" \
    --query "Parameters[].[Name,Type]" --output table

  section "CloudFormation stacks (name-match)"
  run aws cloudformation describe-stacks --region "$REGION" \
    --query "Stacks[?contains(StackName,'$APP')].[StackName,StackStatus]" --output table

  section "Service Discovery namespaces / CloudMap (name-match)"
  run aws servicediscovery list-namespaces --region "$REGION" \
    --query "Namespaces[?contains(Name,'$APP')].[Name,Id,Type]" --output table
else
  echo
  echo "Note: in 'all' mode, name-match sections are skipped (no app to grep on)."
  echo "      Use the Resource Groups Tagging API output above to identify app names,"
  echo "      then drill in:  ./sst-resources.sh <app>"
fi

rm -f /tmp/sst-resources.err
echo
echo "Done."