import { Body, Controller, Get, Put } from '@nestjs/common';
import { FiltersService } from './filters.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { PutFiltersDto } from './dto/filters.dto';

@Controller('filters')
export class FiltersController {
  constructor(private readonly svc: FiltersService) {}

  @Get()
  get(@CurrentUserId() userId: string) {
    return this.svc.get(userId);
  }

  @Put()
  put(@CurrentUserId() userId: string, @Body() body: PutFiltersDto) {
    return this.svc.put(userId, body);
  }
}
