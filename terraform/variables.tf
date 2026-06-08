variable "project" {
  type        = string
  default     = "grasi-zumba"
  description = "Project name, used as a prefix for resource names."
}

variable "environment" {
  type        = string
  default     = "prod"
  description = "Deployment environment (e.g. dev, prod)."
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region. Note: CloudFront ACM certs (if you add a custom domain) must live in us-east-1."
}

variable "admin_bootstrap_emails" {
  type        = list(string)
  default     = []
  description = "Emails auto-promoted to admin on signup/login (e.g. Grasi's email). Lower-cased."
}

variable "domain_name" {
  type        = string
  default     = ""
  description = <<-EOT
    Custom apex domain (e.g. "zumbabygrasiele.com"). Empty = serve on the default *.cloudfront.net
    URL. When set, www.<domain> is included automatically. DNS must be in a Route 53 hosted zone
    in this account.
  EOT
}

variable "email_from" {
  type        = string
  default     = "Zumba by Grasiele <grasi@zumbabygrasiele.com>"
  description = "From header for outbound email (must be on the SES-verified domain)."
}

variable "contact_to" {
  type        = string
  default     = "grasi@zumbabygrasiele.com"
  description = "Where contact-form inquiries are delivered."
}

variable "frontend_origin" {
  type        = string
  default     = "https://localhost"
  description = <<-EOT
    CORS origin for the API. In production the SPA and API are same-origin (one CloudFront
    distribution), so this only matters for cross-origin dev tooling. Set to your custom domain
    once you have one.
  EOT
}

variable "log_retention_days" {
  type        = number
  default     = 30
  description = "CloudWatch log retention for the Lambda."
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Extra tags applied to all resources."
}
