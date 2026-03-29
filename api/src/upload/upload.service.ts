import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as sharp from 'sharp';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get('HETZNER_S3_BUCKET');
    this.s3 = new S3Client({
      endpoint: config.get('HETZNER_S3_ENDPOINT'),
      region: 'eu-central-1',
      credentials: {
        accessKeyId: config.get('HETZNER_S3_ACCESS_KEY'),
        secretAccessKey: config.get('HETZNER_S3_SECRET_KEY'),
      },
      forcePathStyle: true,
    });
  }

  async uploadFoto(
    buffer: Buffer,
    mimetype: string,
    visitaId: string,
  ): Promise<{ url: string; thumbnail_url: string; tamanho_bytes: number }> {
    const id = uuidv4();
    const key = `visitas/${visitaId}/${id}.jpg`;
    const thumbKey = `visitas/${visitaId}/thumb_${id}.jpg`;

    // Comprime imagem original (rotate() auto-orienta e remove EXIF/GPS)
    const imgBuffer = await sharp(buffer)
      .rotate()
      .resize(3508, 3508, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 95 })
      .toBuffer();

    // Gera thumbnail (rotate() remove EXIF/GPS)
    const thumbBuffer = await sharp(buffer)
      .rotate()
      .resize(600, 600, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();

    await Promise.all([
      this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: imgBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      })),
      this.s3.send(new PutObjectCommand({
        Bucket: this.bucket,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: 'image/jpeg',
        ACL: 'public-read',
      })),
    ]);

    this.logger.log(`Foto enviada: visita=${visitaId}, tamanho=${imgBuffer.length}B`);

    const publicUrl = this.config.get('HETZNER_S3_PUBLIC_URL') || this.config.get('HETZNER_S3_ENDPOINT');
    const baseUrl = `${publicUrl}/${this.bucket}`;
    return {
      url: `${baseUrl}/${key}`,
      thumbnail_url: `${baseUrl}/${thumbKey}`,
      tamanho_bytes: imgBuffer.length,
    };
  }

  async deletarFoto(url: string) {
    const key = url.split(`${this.bucket}/`)[1];
    if (!key) return;
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
