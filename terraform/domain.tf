# Custom domain for CloudFront: ACM cert (us-east-1) + DNS validation + alias records, all in
# Route 53. Everything here is gated on var.domain_name being set, so the stack still works with
# the default CloudFront URL when it's empty.

locals {
  domain_enabled = var.domain_name != ""
  # Serve both the apex and www.
  domain_aliases = local.domain_enabled ? [var.domain_name, "www.${var.domain_name}"] : []
}

data "aws_route53_zone" "main" {
  count        = local.domain_enabled ? 1 : 0
  name         = var.domain_name
  private_zone = false
}

# CloudFront requires the cert in us-east-1 — the default provider already is.
resource "aws_acm_certificate" "cf" {
  count                     = local.domain_enabled ? 1 : 0
  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# One validation CNAME per distinct name (apex + www may share one).
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in(local.domain_enabled ? aws_acm_certificate.cf[0].domain_validation_options : []) :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }
  zone_id         = data.aws_route53_zone.main[0].zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "cf" {
  count                   = local.domain_enabled ? 1 : 0
  certificate_arn         = aws_acm_certificate.cf[0].arn
  validation_record_fqdns = [for r in aws_route53_record.cert_validation : r.fqdn]
}

# Point the apex + www at the CloudFront distribution (Route 53 alias A records).
resource "aws_route53_record" "alias" {
  for_each = toset(local.domain_aliases)
  zone_id  = data.aws_route53_zone.main[0].zone_id
  name     = each.value
  type     = "A"

  alias {
    name                   = aws_cloudfront_distribution.main.domain_name
    zone_id                = aws_cloudfront_distribution.main.hosted_zone_id
    evaluate_target_health = false
  }
}

output "custom_domain_urls" {
  description = "Custom domain URLs (once DNS + cert have propagated)."
  value       = [for a in local.domain_aliases : "https://${a}"]
}
