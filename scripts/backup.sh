#!/usr/bin/env bash
# One-command backup: pg_dump → compressed file → upload to S3
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${TIMESTAMP}.sql.gz"
S3_PATH="s3://${S3_BUCKET:-helpdesk}/backups/${BACKUP_FILE}"

echo "[backup] Dumping database…"
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-helpdesk}" \
  "${POSTGRES_DB:-helpdesk}" \
  | gzip > "/tmp/${BACKUP_FILE}"

echo "[backup] Uploading to ${S3_PATH}…"
docker compose run --rm -T \
  -e AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY}" \
  -e AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY}" \
  -e AWS_ENDPOINT_URL="${S3_ENDPOINT}" \
  amazon/aws-cli:2.x \
  s3 cp "/tmp/${BACKUP_FILE}" "${S3_PATH}" \
  --endpoint-url "${S3_ENDPOINT:-http://localhost:9000}"

rm -f "/tmp/${BACKUP_FILE}"
echo "[backup] Done: ${S3_PATH}"
