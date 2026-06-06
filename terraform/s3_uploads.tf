# Private bucket for user profile pictures. Access is only ever via presigned URLs minted by the API.

resource "aws_s3_bucket" "uploads" {
  bucket = "${local.name_prefix}-uploads-${local.account_id}"
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Presigned PUT uploads come straight from the browser, so the bucket needs CORS. The presigned URL
# is itself the authorization; tighten AllowedOrigins to your domain once it's known.
resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  cors_rule {
    allowed_methods = ["PUT", "GET"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}

# Avatars are small and frequently replaced — expire orphaned uploads after a while is optional.
resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"
    filter {} # applies to all objects
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
