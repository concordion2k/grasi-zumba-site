#!/bin/bash
# Runs automatically inside the LocalStack container once it's ready
# (mounted into /etc/localstack/init/ready.d/). Creates the same resources Terraform creates in AWS,
# so local dev matches production. `awslocal` is preinstalled and points at the local endpoint.
set -euo pipefail

TABLE=grasi-zumba-local
BUCKET=grasi-zumba-uploads-local

echo "🗄️  Creating DynamoDB table '$TABLE'…"
awslocal dynamodb create-table \
  --table-name "$TABLE" \
  --billing-mode PAY_PER_REQUEST \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
    AttributeName=gsi1pk,AttributeType=S \
    AttributeName=gsi1sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --global-secondary-indexes \
    'IndexName=gsi1,KeySchema=[{AttributeName=gsi1pk,KeyType=HASH},{AttributeName=gsi1sk,KeyType=RANGE}],Projection={ProjectionType=ALL}'

echo "⏲️  Enabling TTL on 'expiresAt'…"
awslocal dynamodb update-time-to-live \
  --table-name "$TABLE" \
  --time-to-live-specification "Enabled=true,AttributeName=expiresAt" || true

echo "🪣 Creating S3 bucket '$BUCKET'…"
awslocal s3 mb "s3://$BUCKET"

echo "🌐 Setting bucket CORS (for presigned browser uploads)…"
awslocal s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration '{
  "CORSRules": [
    {
      "AllowedMethods": ["PUT", "GET"],
      "AllowedOrigins": ["*"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}'

echo "✅ LocalStack init complete — table + bucket ready."
