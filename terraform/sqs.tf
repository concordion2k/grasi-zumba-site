# Email/notification event queue. API handlers publish domain events here; the mailer Lambda
# consumes them, resolves recipients, and sends via SES. Failures after maxReceiveCount land in the DLQ.

resource "aws_sqs_queue" "email_dlq" {
  name                      = "${local.name_prefix}-email-dlq"
  message_retention_seconds = 1209600 # 14 days
}

resource "aws_sqs_queue" "email" {
  name                       = "${local.name_prefix}-email"
  visibility_timeout_seconds = 120 # must be >= mailer Lambda timeout
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_dlq.arn
    maxReceiveCount     = 5
  })
}

output "email_queue_url" {
  value = aws_sqs_queue.email.url
}
