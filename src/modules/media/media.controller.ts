import {
  Controller,
  Post,
  Delete,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { MediaService } from './media.service';

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to Cloudinary' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string,
  ) {
    return this.mediaService.uploadFile(file, folder || 'curatewithng');
  }

  @Delete(':publicId')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a file from Cloudinary' })
  async delete(@Param('publicId') publicId: string) {
    await this.mediaService.deleteFile(publicId);
    return { message: 'File deleted successfully' };
  }
}
