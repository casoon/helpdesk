#!/usr/bin/env bash
# One-command restore: download from S3 → pg_restore
set -euo pipefail

if [[ -z "${BACKUP_FILE:-}" ]]; then
  echo "Usage: BACKUP_FILE=backup_20250101_120000.sql.gz ./scripts/restore.sh"
  exit 1
fi

S3_PATH="s3://${S3_BUCKET:-helpdesk}/backups/${BACKUP_FILE}"
LOCAL_FILE="/tmp/${BACKUP_FILE}"

echo "[restore] Downloading ${S3_PATH}…"
docker compose run --rm -T \
  -e AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}" \
  -e AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}" \
  amazon/aws-cli:2.x \
  s3 cp "${S3_PATH}" - \
  --endpoint-url "${S3_ENDPOINT:-http://localhost:9000}" > "${LOCAL_FILE}"

echo "[restore] Restoring database…"
gunzip -c "${LOCAL_FILE}" | docker compose exec -T postgres psql \
  -U "${POSTGRES_USER:-helpdesk}" \
  "${POSTGRES_DB:-helpdesk}"

rm -f "${LOCAL_FILE}"
echo "[restore] Done."
