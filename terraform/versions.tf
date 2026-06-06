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

  # Remote state. Bootstrap the bucket + lock table once (see terraform/README.md), then run:
  #   terraform init -backend-config=backend.hcl
  #
  # backend "s3" {
  #   bucket         = "grasi-zumba-tfstate"
  #   key            = "infra/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "grasi-zumba-tflock"
  #   encrypt        = true
  # }
}
