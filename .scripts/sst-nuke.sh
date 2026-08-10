#!/usr/bin/env bash
# Usage:
#   ./sst-nuke.sh <app-name>                    # DRY RUN — lists what would be deleted
#   ./sst-nuke.sh <app-name> --apply            # actually deletes (with confirmation)
#   ./sst-nuke.sh <app-name> --apply --yes      # deletes without interactive prompt
#   AWS_REGION=us-east-1 ./sst-nuke.sh ...      # region via env (default us-east-1)
#
# Requires an explicit app name. Refuses empty/wildcard/all.
# Prefer `sst remove --stage <stage>` first if state still exists; this is for orphans.
set -uo pipefail

# ────── Args ──────
APP="${1:-}"
shift || true
APPLY=false
ASSUME_YES=false
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    --yes|-y) ASSUME_YES=true ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

REGION="${AWS_REGION:-us-east-1}"

# ────── Guardrails ──────
if [[ -z "$APP" ]]; then
  echo "ERROR: app name required as first argument." >&2
  echo "Usage: $0 <app-name> [--apply] [--yes]" >&2
  exit 2
fi
case "$APP" in
  '*'|all|any|'') echo "ERROR: refusing wildcard app name '$APP'." >&2; exit 2 ;;
esac
if [[ "${#APP}" -lt 4 ]]; then
  echo "ERROR: app name '$APP' is suspiciously short (<4 chars). Bailing." >&2
  exit 2
fi

export AWS_PROFILE="${AWS_PROFILE:-exe}"

# AWS profile + SSO auto-login
if ! aws sts get-caller-identity &>/dev/null; then
  echo "SSO session expired or missing for profile '$AWS_PROFILE' — logging in..."
  aws sso login || {
    echo "  Browser launch failed (common in WSL). Retrying with device code..." >&2
    aws sso login --use-device-code
  }
fi

EC2_FILTER="Name=tag:sst:app,Values=$APP"

# ────── Helpers ──────
say()   { printf '\n=== %s ===\n' "$1"; }
plan()  { printf '  [PLAN]   %s\n' "$1"; }
act()   { printf '  [DO]     %s\n' "$1"; }
ok()    { printf '  [OK]     %s\n' "$1"; }
err()   { printf '  [ERR]    %s\n' "$1"; }
skip()  { printf '  [SKIP]   %s\n' "$1"; }

# do_or_plan <description> -- <cmd...>
# In dry-run prints PLAN line; in apply runs the command, prints OK/ERR.
do_or_plan() {
  local desc="$1"; shift
  if [[ "$1" == "--" ]]; then shift; fi
  if [[ "$APPLY" == "false" ]]; then
    plan "$desc"
    return
  fi
  act "$desc"
  local out rc
  out="$("$@" 2>&1)"
  rc=$?
  if (( rc != 0 )); then
    err "$(echo "$out" | tr '\n' ' ' | head -c 240)"
  else
    ok "done"
  fi
}

# ────── Inventory ──────
echo "App:     $APP"
echo "Region:  $REGION"
echo "Mode:    $([[ $APPLY == true ]] && echo APPLY || echo DRY-RUN)"
echo "Account: $(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo unknown)"

say "Inventory (tag-based and name-match)"

# Collect IDs into arrays. Empty arrays are fine; loops just skip.

mapfile -t INSTANCES < <(aws ec2 describe-instances --region "$REGION" --filters "$EC2_FILTER" \
  "Name=instance-state-name,Values=pending,running,stopping,stopped" \
  --query 'Reservations[].Instances[].InstanceId' --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t VOLUMES < <(aws ec2 describe-volumes --region "$REGION" --filters "$EC2_FILTER" \
  "Name=status,Values=available" \
  --query 'Volumes[].VolumeId' --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t ENIS < <(aws ec2 describe-network-interfaces --region "$REGION" --filters "$EC2_FILTER" \
  "Name=status,Values=available" \
  --query 'NetworkInterfaces[].NetworkInterfaceId' --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t SGS < <(aws ec2 describe-security-groups --region "$REGION" --filters "$EC2_FILTER" \
  --query "SecurityGroups[?GroupName!='default'].GroupId" --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t EIPS < <(aws ec2 describe-addresses --region "$REGION" --filters "$EC2_FILTER" \
  --query 'Addresses[].AllocationId' --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t VPCS < <(aws ec2 describe-vpcs --region "$REGION" --filters "$EC2_FILTER" \
  --query 'Vpcs[].VpcId' --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t SUBNETS < <(aws ec2 describe-subnets --region "$REGION" --filters "$EC2_FILTER" \
  --query 'Subnets[].SubnetId' --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t NATGWS < <(aws ec2 describe-nat-gateways --region "$REGION" --filter "$EC2_FILTER" \
  "Name=state,Values=pending,available,deleting" \
  --query 'NatGateways[].NatGatewayId' --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t IGWS < <(aws ec2 describe-internet-gateways --region "$REGION" --filters "$EC2_FILTER" \
  --query 'InternetGateways[].[InternetGatewayId,Attachments[0].VpcId]' --output text 2>/dev/null | grep -vE '^$|^None$' || true)

mapfile -t RTBS < <(aws ec2 describe-route-tables --region "$REGION" --filters "$EC2_FILTER" \
  --query "RouteTables[?Associations[0].Main!=\`true\`].RouteTableId" --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t KEYPAIRS < <(aws ec2 describe-key-pairs --region "$REGION" --filters "$EC2_FILTER" \
  --query 'KeyPairs[].KeyPairId' --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t SECRETS < <(aws secretsmanager list-secrets --region "$REGION" --include-planned-deletion \
  --filters Key=tag-key,Values=sst:app Key=tag-value,Values="$APP" \
  --query 'SecretList[].ARN' --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t LAMBDAS < <(aws lambda list-functions --region "$REGION" \
  --query "Functions[?contains(FunctionName,'$APP')].FunctionName" --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t BUCKETS < <(aws s3api list-buckets \
  --query "Buckets[?contains(Name,'$APP')].Name" --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t DISTRIBUTIONS < <(aws cloudfront list-distributions \
  --query "DistributionList.Items[?contains(to_string(Origins),'$APP') || contains(to_string(Aliases),'$APP')].Id" \
  --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t RDS_INSTANCES < <(aws rds describe-db-instances --region "$REGION" \
  --query "DBInstances[?contains(DBInstanceIdentifier,'$APP')].DBInstanceIdentifier" --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t RDS_CLUSTERS < <(aws rds describe-db-clusters --region "$REGION" \
  --query "DBClusters[?contains(DBClusterIdentifier,'$APP')].DBClusterIdentifier" --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t RDS_PROXIES < <(aws rds describe-db-proxies --region "$REGION" \
  --query "DBProxies[?contains(DBProxyName,'$APP')].DBProxyName" --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t RDS_SUBNETGRPS < <(aws rds describe-db-subnet-groups --region "$REGION" \
  --query "DBSubnetGroups[?contains(DBSubnetGroupName,'$APP')].DBSubnetGroupName" --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t LOG_GROUPS < <(aws logs describe-log-groups --region "$REGION" \
  --query "logGroups[?contains(logGroupName,'$APP')].logGroupName" --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t IAM_ROLES < <(aws iam list-roles \
  --query "Roles[?contains(RoleName,'$APP')].RoleName" --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t INSTANCE_PROFILES < <(aws iam list-instance-profiles \
  --query "InstanceProfiles[?contains(InstanceProfileName,'$APP') || contains(to_string(Roles),'$APP')].InstanceProfileName" \
  --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t SSM_PARAMS < <(aws ssm describe-parameters --region "$REGION" \
  --parameter-filters "Key=Name,Option=Contains,Values=$APP" \
  --query 'Parameters[].Name' --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t CLOUDMAP_NS < <(aws servicediscovery list-namespaces --region "$REGION" \
  --query "Namespaces[?contains(Name,'$APP')].Id" --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

mapfile -t ECS_CLUSTERS < <(aws ecs list-clusters --region "$REGION" \
  --query "clusterArns[?contains(@,'$APP')]" --output text 2>/dev/null | tr '\t' '\n' | grep -vE '^$|^None$' || true)

# ────── Plan summary ──────
say "Plan summary"
printf '  %-30s %d\n' "EC2 instances:"           "${#INSTANCES[@]}"
printf '  %-30s %d\n' "EBS volumes:"             "${#VOLUMES[@]}"
printf '  %-30s %d\n' "ENIs (available):"        "${#ENIS[@]}"
printf '  %-30s %d\n' "Security groups (non-default): " "${#SGS[@]}"
printf '  %-30s %d\n' "Elastic IPs:"             "${#EIPS[@]}"
printf '  %-30s %d\n' "NAT gateways:"            "${#NATGWS[@]}"
printf '  %-30s %d\n' "Internet gateways:"       "${#IGWS[@]}"
printf '  %-30s %d\n' "Route tables (non-main):" "${#RTBS[@]}"
printf '  %-30s %d\n' "Subnets:"                 "${#SUBNETS[@]}"
printf '  %-30s %d\n' "VPCs:"                    "${#VPCS[@]}"
printf '  %-30s %d\n' "Key pairs:"               "${#KEYPAIRS[@]}"
printf '  %-30s %d\n' "Lambda functions:"        "${#LAMBDAS[@]}"
printf '  %-30s %d\n' "RDS instances:"           "${#RDS_INSTANCES[@]}"
printf '  %-30s %d\n' "RDS clusters:"            "${#RDS_CLUSTERS[@]}"
printf '  %-30s %d\n' "RDS proxies:"             "${#RDS_PROXIES[@]}"
printf '  %-30s %d\n' "RDS subnet groups:"       "${#RDS_SUBNETGRPS[@]}"
printf '  %-30s %d\n' "Secrets Manager:"         "${#SECRETS[@]}"
printf '  %-30s %d\n' "S3 buckets:"              "${#BUCKETS[@]}"
printf '  %-30s %d\n' "CloudFront distributions:" "${#DISTRIBUTIONS[@]}"
printf '  %-30s %d\n' "ECS clusters:"            "${#ECS_CLUSTERS[@]}"
printf '  %-30s %d\n' "CloudWatch log groups:"   "${#LOG_GROUPS[@]}"
printf '  %-30s %d\n' "IAM roles:"               "${#IAM_ROLES[@]}"
printf '  %-30s %d\n' "Instance profiles:"       "${#INSTANCE_PROFILES[@]}"
printf '  %-30s %d\n' "SSM parameters:"          "${#SSM_PARAMS[@]}"
printf '  %-30s %d\n' "CloudMap namespaces:"     "${#CLOUDMAP_NS[@]}"

TOTAL=$(( ${#INSTANCES[@]} + ${#VOLUMES[@]} + ${#ENIS[@]} + ${#SGS[@]} + ${#EIPS[@]} + ${#NATGWS[@]} + ${#IGWS[@]} + ${#RTBS[@]} + ${#SUBNETS[@]} + ${#VPCS[@]} + ${#KEYPAIRS[@]} + ${#LAMBDAS[@]} + ${#RDS_INSTANCES[@]} + ${#RDS_CLUSTERS[@]} + ${#RDS_PROXIES[@]} + ${#RDS_SUBNETGRPS[@]} + ${#SECRETS[@]} + ${#BUCKETS[@]} + ${#DISTRIBUTIONS[@]} + ${#ECS_CLUSTERS[@]} + ${#LOG_GROUPS[@]} + ${#IAM_ROLES[@]} + ${#INSTANCE_PROFILES[@]} + ${#SSM_PARAMS[@]} + ${#CLOUDMAP_NS[@]} ))
echo
echo "Total resources targeted: $TOTAL"

if (( TOTAL == 0 )); then
  echo "Nothing to do."
  exit 0
fi

# ────── Confirmation ──────
if [[ "$APPLY" == "true" && "$ASSUME_YES" == "false" ]]; then
  echo
  echo "About to DELETE the resources above for app '$APP' in $REGION."
  read -r -p "Type the app name exactly to confirm: " confirm
  if [[ "$confirm" != "$APP" ]]; then
    echo "Confirmation mismatch. Aborting."
    exit 1
  fi
fi

# ────── Delete in dependency order ──────

# 1. CloudFront distributions need to be DISABLED first; deletion takes 15-30min. Warn & disable only.
if (( ${#DISTRIBUTIONS[@]} > 0 )); then
  say "CloudFront distributions (disable only — re-run later to delete)"
  for d in "${DISTRIBUTIONS[@]}"; do
    if [[ "$APPLY" == "false" ]]; then plan "disable distribution $d"; continue; fi
    act "disable distribution $d"
    etag="$(aws cloudfront get-distribution-config --id "$d" --query 'ETag' --output text 2>/dev/null)"
    aws cloudfront get-distribution-config --id "$d" --query 'DistributionConfig' > /tmp/cf-config.json 2>/dev/null
    jq '.Enabled=false' /tmp/cf-config.json > /tmp/cf-config-disabled.json 2>/dev/null
    if aws cloudfront update-distribution --id "$d" --distribution-config "file:///tmp/cf-config-disabled.json" --if-match "$etag" >/dev/null 2>&1; then
      ok "disabled (wait 15-30min for Deployed state, then re-run script to actually delete)"
    else
      err "failed to disable; check manually"
    fi
  done
fi

# 2. ECS — drain services, delete services, delete clusters
if (( ${#ECS_CLUSTERS[@]} > 0 )); then
  say "ECS clusters"
  for c in "${ECS_CLUSTERS[@]}"; do
    # services
    for s in $(aws ecs list-services --cluster "$c" --region "$REGION" --query 'serviceArns' --output text 2>/dev/null); do
      do_or_plan "ECS update-service $s desiredCount=0" -- aws ecs update-service --cluster "$c" --service "$s" --desired-count 0 --region "$REGION"
      do_or_plan "ECS delete-service $s" -- aws ecs delete-service --cluster "$c" --service "$s" --force --region "$REGION"
    done
    do_or_plan "ECS delete-cluster $c" -- aws ecs delete-cluster --cluster "$c" --region "$REGION"
  done
fi

# 3. Lambda functions
if (( ${#LAMBDAS[@]} > 0 )); then
  say "Lambda functions"
  for f in "${LAMBDAS[@]}"; do
    do_or_plan "delete lambda $f" -- aws lambda delete-function --function-name "$f" --region "$REGION"
  done
fi

# 4. EC2 instances — terminate (waits 30-60s before they release ENIs)
if (( ${#INSTANCES[@]} > 0 )); then
  say "EC2 instances"
  if [[ "$APPLY" == "true" ]]; then
    act "terminate ${#INSTANCES[@]} instance(s)"
    aws ec2 terminate-instances --region "$REGION" --instance-ids "${INSTANCES[@]}" >/dev/null 2>&1 && ok "termination requested" || err "termination failed"
    act "waiting up to 5min for terminated state (ENI release)"
    aws ec2 wait instance-terminated --region "$REGION" --instance-ids "${INSTANCES[@]}" 2>/dev/null && ok "terminated" || err "wait timed out — continuing anyway"
  else
    for i in "${INSTANCES[@]}"; do plan "terminate instance $i"; done
  fi
fi

# 5. RDS proxies → instances → clusters → subnet groups
if (( ${#RDS_PROXIES[@]} > 0 )); then
  say "RDS proxies"
  for p in "${RDS_PROXIES[@]}"; do
    do_or_plan "delete RDS proxy $p" -- aws rds delete-db-proxy --db-proxy-name "$p" --region "$REGION"
  done
fi

if (( ${#RDS_INSTANCES[@]} > 0 )); then
  say "RDS instances"
  for r in "${RDS_INSTANCES[@]}"; do
    do_or_plan "delete RDS instance $r (skip final snapshot)" -- \
      aws rds delete-db-instance --db-instance-identifier "$r" --skip-final-snapshot --delete-automated-backups --region "$REGION"
  done
fi

if (( ${#RDS_CLUSTERS[@]} > 0 )); then
  say "RDS clusters"
  for c in "${RDS_CLUSTERS[@]}"; do
    do_or_plan "delete RDS cluster $c (skip final snapshot)" -- \
      aws rds delete-db-cluster --db-cluster-identifier "$c" --skip-final-snapshot --region "$REGION"
  done
fi

if (( ${#RDS_SUBNETGRPS[@]} > 0 )); then
  say "RDS subnet groups (may need RDS instances/proxies fully gone first)"
  for g in "${RDS_SUBNETGRPS[@]}"; do
    do_or_plan "delete RDS subnet group $g" -- aws rds delete-db-subnet-group --db-subnet-group-name "$g" --region "$REGION"
  done
fi

# 6. S3 buckets — empty then delete
if (( ${#BUCKETS[@]} > 0 )); then
  say "S3 buckets"
  for b in "${BUCKETS[@]}"; do
    do_or_plan "empty bucket $b (all versions + delete markers)" -- bash -c "aws s3api delete-objects --bucket '$b' --delete \"\$(aws s3api list-object-versions --bucket '$b' --output json --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}')\" 2>/dev/null; aws s3api delete-objects --bucket '$b' --delete \"\$(aws s3api list-object-versions --bucket '$b' --output json --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}')\" 2>/dev/null; aws s3 rm 's3://$b' --recursive"
    do_or_plan "delete bucket $b" -- aws s3api delete-bucket --bucket "$b"
  done
fi

# 7. NAT gateways
if (( ${#NATGWS[@]} > 0 )); then
  say "NAT gateways"
  for n in "${NATGWS[@]}"; do
    do_or_plan "delete NAT gateway $n" -- aws ec2 delete-nat-gateway --nat-gateway-id "$n" --region "$REGION"
  done
fi

# 8. Available ENIs (after NAT/Lambda/instances gone)
if (( ${#ENIS[@]} > 0 )); then
  say "ENIs"
  for e in "${ENIS[@]}"; do
    do_or_plan "delete ENI $e" -- aws ec2 delete-network-interface --network-interface-id "$e" --region "$REGION"
  done
fi

# 9. Available EBS volumes
if (( ${#VOLUMES[@]} > 0 )); then
  say "EBS volumes"
  for v in "${VOLUMES[@]}"; do
    do_or_plan "delete volume $v" -- aws ec2 delete-volume --volume-id "$v" --region "$REGION"
  done
fi

# 10. Release EIPs
if (( ${#EIPS[@]} > 0 )); then
  say "Elastic IPs"
  for a in "${EIPS[@]}"; do
    do_or_plan "release EIP $a" -- aws ec2 release-address --allocation-id "$a" --region "$REGION"
  done
fi

# 11. Detach + delete internet gateways
if (( ${#IGWS[@]} > 0 )); then
  say "Internet gateways"
  for line in "${IGWS[@]}"; do
    igw=$(echo "$line" | awk '{print $1}')
    vpc=$(echo "$line" | awk '{print $2}')
    if [[ -n "$vpc" && "$vpc" != "None" ]]; then
      do_or_plan "detach IGW $igw from $vpc" -- aws ec2 detach-internet-gateway --internet-gateway-id "$igw" --vpc-id "$vpc" --region "$REGION"
    fi
    do_or_plan "delete IGW $igw" -- aws ec2 delete-internet-gateway --internet-gateway-id "$igw" --region "$REGION"
  done
fi

# 12. Route tables (non-main)
if (( ${#RTBS[@]} > 0 )); then
  say "Route tables"
  for r in "${RTBS[@]}"; do
    # Disassociate first
    for a in $(aws ec2 describe-route-tables --route-table-ids "$r" --region "$REGION" \
        --query "RouteTables[0].Associations[?Main!=\`true\`].RouteTableAssociationId" --output text 2>/dev/null); do
      do_or_plan "disassociate $a from $r" -- aws ec2 disassociate-route-table --association-id "$a" --region "$REGION"
    done
    do_or_plan "delete route table $r" -- aws ec2 delete-route-table --route-table-id "$r" --region "$REGION"
  done
fi

# 13. Subnets
if (( ${#SUBNETS[@]} > 0 )); then
  say "Subnets"
  for s in "${SUBNETS[@]}"; do
    do_or_plan "delete subnet $s" -- aws ec2 delete-subnet --subnet-id "$s" --region "$REGION"
  done
fi

# 14. Security groups (non-default)
if (( ${#SGS[@]} > 0 )); then
  say "Security groups"
  for g in "${SGS[@]}"; do
    do_or_plan "delete security group $g" -- aws ec2 delete-security-group --group-id "$g" --region "$REGION"
  done
fi

# 15. Key pairs
if (( ${#KEYPAIRS[@]} > 0 )); then
  say "Key pairs"
  for k in "${KEYPAIRS[@]}"; do
    do_or_plan "delete key pair $k" -- aws ec2 delete-key-pair --key-pair-id "$k" --region "$REGION"
  done
fi

# 16. VPCs
if (( ${#VPCS[@]} > 0 )); then
  say "VPCs"
  for v in "${VPCS[@]}"; do
    do_or_plan "delete VPC $v" -- aws ec2 delete-vpc --vpc-id "$v" --region "$REGION"
  done
fi

# 17. Instance profiles → IAM roles
if (( ${#INSTANCE_PROFILES[@]} > 0 )); then
  say "Instance profiles"
  for p in "${INSTANCE_PROFILES[@]}"; do
    for r in $(aws iam get-instance-profile --instance-profile-name "$p" --query 'InstanceProfile.Roles[].RoleName' --output text 2>/dev/null); do
      do_or_plan "remove role $r from instance profile $p" -- aws iam remove-role-from-instance-profile --instance-profile-name "$p" --role-name "$r"
    done
    do_or_plan "delete instance profile $p" -- aws iam delete-instance-profile --instance-profile-name "$p"
  done
fi

if (( ${#IAM_ROLES[@]} > 0 )); then
  say "IAM roles"
  for r in "${IAM_ROLES[@]}"; do
    # detach managed policies
    for arn in $(aws iam list-attached-role-policies --role-name "$r" --query 'AttachedPolicies[].PolicyArn' --output text 2>/dev/null); do
      do_or_plan "detach managed policy $arn from $r" -- aws iam detach-role-policy --role-name "$r" --policy-arn "$arn"
    done
    # delete inline policies
    for p in $(aws iam list-role-policies --role-name "$r" --query 'PolicyNames' --output text 2>/dev/null); do
      do_or_plan "delete inline policy $p on $r" -- aws iam delete-role-policy --role-name "$r" --policy-name "$p"
    done
    do_or_plan "delete role $r" -- aws iam delete-role --role-name "$r"
  done
fi

# 18. Secrets Manager (force delete, skip recovery window)
if (( ${#SECRETS[@]} > 0 )); then
  say "Secrets Manager"
  for s in "${SECRETS[@]}"; do
    do_or_plan "force-delete secret $s" -- aws secretsmanager delete-secret --secret-id "$s" --force-delete-without-recovery --region "$REGION"
  done
fi

# 19. SSM parameters
if (( ${#SSM_PARAMS[@]} > 0 )); then
  say "SSM parameters"
  for p in "${SSM_PARAMS[@]}"; do
    do_or_plan "delete SSM parameter $p" -- aws ssm delete-parameter --name "$p" --region "$REGION"
  done
fi

# 20. CloudWatch log groups
if (( ${#LOG_GROUPS[@]} > 0 )); then
  say "CloudWatch log groups"
  for l in "${LOG_GROUPS[@]}"; do
    do_or_plan "delete log group $l" -- aws logs delete-log-group --log-group-name "$l" --region "$REGION"
  done
fi

# 21. Service Discovery / CloudMap
if (( ${#CLOUDMAP_NS[@]} > 0 )); then
  say "CloudMap namespaces"
  for n in "${CLOUDMAP_NS[@]}"; do
    do_or_plan "delete CloudMap namespace $n" -- aws servicediscovery delete-namespace --id "$n" --region "$REGION"
  done
fi

echo
if [[ "$APPLY" == "false" ]]; then
  echo "Dry run complete. Re-run with --apply to actually delete."
else
  echo "Apply pass complete."
  echo "Note: some resources (CloudFront, RDS, VPCs with stuck ENIs) may take time to fully delete."
  echo "Re-run the script later to clean up anything that lagged."
fi