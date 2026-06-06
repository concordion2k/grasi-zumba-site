# Infrastructure (Terraform)

All AWS resources for Grasi Zumba, defined as code.

## What gets created

| Resource                       | Purpose                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| DynamoDB table (`*-table`)     | Single-table store for users, classes, bookings, notes, sessions   |
| Lambda (`*-api`) + API Gateway | The Hono API (Node 20, arm64)                                      |
| S3 (`*-site-*`) + CloudFront   | Hosts the Vue SPA; CloudFront also proxies `/api/*` to API Gateway |
| S3 (`*-uploads-*`)             | Private profile-picture storage (presigned access)                 |
| SSM SecureString               | Auto-generated session HMAC secret                                 |
| IAM role/policy                | Least-privilege access for the Lambda                              |

The whole thing fits comfortably in the AWS free tier / a few dollars a month at low traffic, since
DynamoDB, Lambda, and API Gateway all scale to (near) zero.

## Prerequisites

1. Authenticated AWS CLI session (`aws sso login` or equivalent). **Note:** the session was expired
   when this repo was scaffolded — re-auth first.
2. The API must be built so its zip exists: `npm run build:api` from the repo root. Terraform packages
   `api/dist` into the Lambda.

## First apply (local state)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # edit admin emails etc.
terraform init
terraform apply
```

Then push the built frontend and you're live:

```bash
npm run build:frontend
aws s3 sync ../frontend/dist "s3://$(terraform output -raw frontend_bucket)" --delete
aws cloudfront create-invalidation \
  --distribution-id "$(terraform output -raw cloudfront_distribution_id)" --paths '/*'

terraform output site_url
```

## Remote state (recommended before sharing/CI)

Create the state bucket + lock table once, then point Terraform at them:

```bash
aws s3api create-bucket --bucket grasi-zumba-tfstate --region us-east-1
aws s3api put-bucket-versioning --bucket grasi-zumba-tfstate \
  --versioning-configuration Status=Enabled
aws dynamodb create-table --table-name grasi-zumba-tflock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST
```

Uncomment the `backend "s3"` block in [versions.tf](./versions.tf), then `terraform init -migrate-state`.

## Notes & next steps

- **Custom domain:** add an ACM cert (in `us-east-1`), set the CloudFront `aliases` +
  `viewer_certificate`, and create the Route 53 record. Then set `frontend_origin` to the domain.
- **`prevent_destroy`** is set on the DynamoDB table so customer data can't be wiped by an accidental
  `terraform destroy`. Remove it deliberately if you ever need to tear down.
- The Lambda code is updated on every deploy via the CI pipeline (it re-zips `api/dist` and updates
  the function). Infra changes still go through `terraform apply`.
