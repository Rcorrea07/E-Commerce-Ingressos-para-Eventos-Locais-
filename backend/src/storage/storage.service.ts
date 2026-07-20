import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import type { Env } from '../config/env.js';

@Injectable()
export class StorageService {
  private readonly client: Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(config: ConfigService<Env, true>) {
    this.client = new Client({
      endPoint: config.get('MINIO_ENDPOINT', { infer: true }),
      port: config.get('MINIO_PORT', { infer: true }),
      useSSL: config.get('MINIO_USE_SSL', { infer: true }),
      accessKey: config.get('MINIO_ACCESS_KEY', { infer: true }),
      secretKey: config.get('MINIO_SECRET_KEY', { infer: true })
    });
    this.bucket = config.get('MINIO_BUCKET', { infer: true });
    this.publicUrl = config.get('MINIO_PUBLIC_URL', { infer: true }).replace(/\/$/, '');
  }

  put(key: string, buffer: Buffer, mimeType: string): Promise<unknown> {
    return this.client.putObject(this.bucket, key, buffer, buffer.length, { 'Content-Type': mimeType });
  }

  remove(key: string): Promise<void> { return this.client.removeObject(this.bucket, key); }
  url(key: string): string { return `${this.publicUrl}/${this.bucket}/${key}`; }
  async ready(): Promise<boolean> { return this.client.bucketExists(this.bucket); }
}
