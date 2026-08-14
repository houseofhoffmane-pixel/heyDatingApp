import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { PhotosService } from './photos.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { UploadUrlDto } from './dto/upload-url.dto';
import { ConfirmPhotoDto } from './dto/confirm.dto';
import { ReorderPhotosDto } from './dto/reorder.dto';

@Controller('photos')
export class PhotosController {
  constructor(private readonly svc: PhotosService) {}

  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  uploadUrl(@CurrentUserId() userId: string, @Body() body: UploadUrlDto) {
    return this.svc.uploadUrl(userId, body);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  confirm(@CurrentUserId() userId: string, @Body() body: ConfirmPhotoDto) {
    return this.svc.confirm(userId, body);
  }

  @Delete(':id')
  remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.svc.remove(userId, id);
  }

  @Patch('reorder')
  reorder(@CurrentUserId() userId: string, @Body() body: ReorderPhotosDto) {
    return this.svc.reorder(userId, body);
  }
}
