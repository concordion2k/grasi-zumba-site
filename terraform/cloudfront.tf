# Single CloudFront distribution fronting both the SPA (S3) and the API (API Gateway). Same origin
# for the browser → cookies + CSRF "just work", and no CORS in production.

locals {
  s3_origin_id  = "s3-frontend"
  api_origin_id = "apigw-api"
  # API Gateway $default stage endpoint host (no stage path).
  api_origin_host = "${aws_apigatewayv2_api.http.id}.execute-api.${data.aws_region.current.name}.amazonaws.com"
}

# AWS-managed policies (referenced by name so we don't hardcode IDs).
data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}
data "aws_cloudfront_cache_policy" "disabled" {
  name = "Managed-CachingDisabled"
}
data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.name_prefix}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# SPA fallback: rewrite extension-less paths to /index.html. Scoped to the default behavior only,
# so API responses keep their real status codes.
resource "aws_cloudfront_function" "spa_rewrite" {
  name    = "${local.name_prefix}-spa-rewrite"
  runtime = "cloudfront-js-2.0"
  code    = <<-JS
    function handler(event) {
      var req = event.request;
      var uri = req.uri;
      if (uri.indexOf('.') === -1) {
        req.uri = '/index.html';
      }
      return req;
    }
  JS
}

resource "aws_cloudfront_distribution" "main" {
  enabled             = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100"
  comment             = "${local.name_prefix} site + api"
  aliases             = local.domain_aliases

  # --- Origins ---
  origin {
    origin_id                = local.s3_origin_id
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  origin {
    origin_id   = local.api_origin_id
    domain_name = local.api_origin_host
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # --- API behavior (must come before default) ---
  ordered_cache_behavior {
    path_pattern             = "/api/*"
    target_origin_id         = local.api_origin_id
    viewer_protocol_policy   = "https-only"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    cache_policy_id          = data.aws_cloudfront_cache_policy.disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
  }

  # --- SPA default behavior ---
  default_cache_behavior {
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
    compress               = true

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_rewrite.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    # Default *.cloudfront.net cert until a custom domain is configured; then the validated ACM cert.
    cloudfront_default_certificate = local.domain_enabled ? null : true
    acm_certificate_arn            = one(aws_acm_certificate_validation.cf[*].certificate_arn)
    ssl_support_method             = local.domain_enabled ? "sni-only" : null
    minimum_protocol_version       = local.domain_enabled ? "TLSv1.2_2021" : "TLSv1"
  }
}
