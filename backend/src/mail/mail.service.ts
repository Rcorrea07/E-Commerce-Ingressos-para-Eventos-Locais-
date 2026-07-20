import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type { Env } from '../config/env.js';

@Injectable()
export class MailService {
  private readonly transporter;
  private readonly from: string;

  constructor(config: ConfigService<Env, true>) {
    this.transporter = nodemailer.createTransport({ host: config.get('SMTP_HOST', { infer: true }), port: config.get('SMTP_PORT', { infer: true }), secure: false });
    this.from = config.get('SMTP_FROM', { infer: true });
  }

  async send(to: string, subject: string, text: string): Promise<void> {
    await this.transporter.sendMail({ from: this.from, to, subject, text });
  }
}
