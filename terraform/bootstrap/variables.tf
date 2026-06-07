variable "project" {
  type    = string
  default = "grasi-zumba"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "state_bucket" {
  type        = string
  default     = "grasi-zumba-tfstate"
  description = "S3 bucket for the main stack's remote Terraform state. Must be globally unique."
}

variable "lock_table" {
  type    = string
  default = "grasi-zumba-tflock"
}

variable "github_repo" {
  type        = string
  default     = "concordion2k/grasi-zumba-site"
  description = "owner/repo allowed to assume the deploy role via GitHub OIDC."
}

variable "create_oidc_provider" {
  type        = bool
  default     = true
  description = "Set to false if a GitHub Actions OIDC provider already exists in this account."
}
