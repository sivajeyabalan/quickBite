import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async uploadImage(file: Express.Multer.File, folder = 'quickbite/menu') {
    if (!file) {
      throw new InternalServerErrorException('No file received for upload');
    }

    const base64 = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64}`;

    try {
      const result = await cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: 'image',
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch {
      throw new InternalServerErrorException('Cloudinary upload failed');
    }
  }
}
