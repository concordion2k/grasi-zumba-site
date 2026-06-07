terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
  # Bootstrap uses LOCAL state on purpose — it creates the very bucket the main stack stores its
  # state in, so it can't store its own state there. Keep terraform/bootstrap/terraform.tfstate safe
  # (it's git-ignored). This stack is tiny and rarely changes.
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "terraform-bootstrap"
    }
  }
}
