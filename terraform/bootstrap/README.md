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
- The deploy role is **least-privilege**: mutating actions are scoped to this app's resources
  (`<project>-<app_env>-*`), `PassRole` is restricted to Lambda, and it can't modify itself or create
  arbitrary roles. The only `*` resources are global services with no resource-level IAM (CloudFront)
  or unavoidable lookups (`RequestCertificate`, `Describe`/`List`). Route 53 record changes are
  limited to `var.hosted_zone_id`.
