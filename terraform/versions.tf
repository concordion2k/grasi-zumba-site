terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.6"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote state lives in the S3 bucket + lock table created by terraform/bootstrap.
  # Config is supplied via backend.hcl: `terraform init -backend-config=backend.hcl`.
  backend "s3" {}
}
