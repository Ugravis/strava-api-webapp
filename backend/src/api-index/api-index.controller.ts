import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { ApiEndpointsService } from './api-endpoints.service';
import { renderApiIndex } from './api-index.page';

/** `GET /api`: plain HTML listing of the endpoints. */
@Public()
@Controller()
export class ApiIndexController {
  constructor(private readonly endpoints: ApiEndpointsService) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  index(): string {
    return renderApiIndex(this.endpoints.list());
  }
}
