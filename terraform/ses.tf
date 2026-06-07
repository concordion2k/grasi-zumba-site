# SES sending for the custom domain. We add ONLY Easy-DKIM CNAMEs (unique selectors) — the apex
# SPF/TXT and MX stay untouched, so Zoho receiving is unaffected. SES's default MAIL FROM
# (amazonses.com) passes SPF, and our DKIM signing gives DMARC alignment for the domain.
# Gated on var.domain_name (see domain.tf for local.domain_enabled + the Route 53 zone data source).

resource "aws_sesv2_email_identity" "domain" {
  count          = local.domain_enabled ? 1 : 0
  email_identity = var.domain_name
}

resource "aws_route53_record" "ses_dkim" {
  count   = local.domain_enabled ? 3 : 0
  zone_id = data.aws_route53_zone.main[0].zone_id
  name    = "${aws_sesv2_email_identity.domain[0].dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = ["${aws_sesv2_email_identity.domain[0].dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com"]
}

output "ses_identity" {
  description = "SES domain identity (verifies once the DKIM CNAMEs propagate)."
  value       = local.domain_enabled ? aws_sesv2_email_identity.domain[0].email_identity : "(disabled — no domain_name)"
}
