# Bootstrap (one-time)

Creates the prerequisites that must exist **before** the main stack can deploy via CI:

- S3 bucket for remote Terraform state (`grasi-zumba-tfstate`)
- DynamoDB lock table (`grasi-zumba-tflock`)
- GitHub Actions **OIDC provider** + a **deploy IAM role** the pipeline assumes

Run this once, manually, with admin AWS credentials:

```bash
cd terraform/bootstrap
terraform init
terraform apply        # review, then yes
```

Then take the output:

```bash
terraform output deploy_role_arn
```

…and add it as a GitHub Actions secret named **`AWS_DEPLOY_ROLE_ARN`**
(repo → Settings → Secrets and variables → Actions → New repository secret).

Notes:

- This stack uses **local state** (`terraform.tfstate` here, git-ignored) — it can't store state in the
  bucket it's creating. Keep that file, or just re-run later (it's idempotent).
- If your account already has a GitHub OIDC provider, run with `-var create_oidc_provider=false`.
- The deploy role's permissions are broad-by-service for simplicity; tighten later if you like.
