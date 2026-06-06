import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env.js';

const s3 = new S3Client({
  region: env.region,
  // The SDK's default ("WHEN_SUPPORTED") bakes a CRC32 checksum param into presigned URLs, which
  // breaks plain browser `fetch`/`PUT` uploads (the body checksum can't match the placeholder).
  // "WHEN_REQUIRED" keeps presigned URLs clean so any HTTP client can upload to them.
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
  ...(env.s3Endpoint ? { endpoint: env.s3Endpoint, forcePathStyle: env.s3ForcePathStyle } : {}),
});

/** Presigned PUT URL the browser uses to upload a profile picture directly to S3. */
export function presignUpload(key: string, contentType: string, expiresIn = 300): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: env.uploadsBucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn });
}

/** Presigned GET URL so the private profile picture can be displayed by the client. */
export function presignDownload(key: string, expiresIn = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: env.uploadsBucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn });
}
