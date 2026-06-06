# Packages api/dist (produced by `npm run build:api`) into the Lambda deployment zip.
# CI runs the build before `terraform apply`; for a local apply, build first.
data "archive_file" "api" {
  type        = "zip"
  source_dir  = "${path.module}/../api/dist"
  output_path = "${path.module}/.build/api.zip"
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${local.name_prefix}-api"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "api" {
  function_name = "${local.name_prefix}-api"
  role          = aws_iam_role.lambda.arn
  runtime       = "nodejs20.x"
  handler       = "index.handler"
  architectures = ["arm64"]
  memory_size   = 256
  timeout       = 15

  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256

  environment {
    variables = {
      TABLE_NAME             = aws_dynamodb_table.main.name
      UPLOADS_BUCKET         = aws_s3_bucket.uploads.bucket
      SESSION_SECRET         = random_password.session_secret.result
      ADMIN_BOOTSTRAP_EMAILS = join(",", var.admin_bootstrap_emails)
      FRONTEND_ORIGIN        = var.frontend_origin
      COOKIE_SECURE          = "true"
      NODE_OPTIONS           = "--enable-source-maps"
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_basic,
    aws_cloudwatch_log_group.api,
  ]
}
