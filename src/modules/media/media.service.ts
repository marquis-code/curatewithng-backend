import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'curatewithng'): Promise<{ url: string; publicId: string }> {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP images are allowed');
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error('Cloudinary upload error:', error);
            reject(new BadRequestException('File upload failed'));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.error('Cloudinary delete error:', error);
      throw new BadRequestException('File deletion failed');
    }
  }
}
