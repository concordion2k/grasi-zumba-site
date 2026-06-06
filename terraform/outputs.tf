output "site_url" {
  description = "Public URL of the website (CloudFront)."
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "Used by CI to create cache invalidations after a frontend deploy."
  value       = aws_cloudfront_distribution.main.id
}

output "frontend_bucket" {
  description = "S3 bucket that CI syncs the built SPA into."
  value       = aws_s3_bucket.frontend.bucket
}

output "uploads_bucket" {
  description = "S3 bucket for profile-picture uploads."
  value       = aws_s3_bucket.uploads.bucket
}

output "api_endpoint" {
  description = "Direct API Gateway endpoint (normally accessed via CloudFront /api/*)."
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "dynamodb_table" {
  description = "Name of the single DynamoDB table."
  value       = aws_dynamodb_table.main.name
}

output "lambda_function_name" {
  description = "API Lambda function name (CI updates its code on deploy)."
  value       = aws_lambda_function.api.function_name
}
