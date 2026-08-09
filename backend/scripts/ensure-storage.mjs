import { Client } from 'minio';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const client = new Client({
  endPoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  port: Number(process.env.MINIO_PORT ?? 9000),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
});
const bucket = process.env.MINIO_BUCKET ?? 'event-media';
const policy = JSON.stringify({
  Version: '2012-10-17',
  Statement: [{
    Effect: 'Allow',
    Principal: { AWS: ['*'] },
    Action: ['s3:GetObject'],
    Resource: [`arn:aws:s3:::${bucket}/*`]
  }]
});

const maxAttempts = 60;
for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  try {
    if (!await client.bucketExists(bucket)) await client.makeBucket(bucket, 'us-east-1');
    await client.setBucketPolicy(bucket, policy);
    process.exit(0);
  } catch (error) {
    if (attempt === maxAttempts) throw error;
    await delay(2_000);
  }
}
