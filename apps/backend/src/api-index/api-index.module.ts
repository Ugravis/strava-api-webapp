import { type DynamicModule, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { ApiEndpointsService } from './api-endpoints.service';
import { ApiIndexController } from './api-index.controller';

/** Endpoint listing on `GET /api`. Not served in production. */
@Module({})
export class ApiIndexModule {
  static forEnvironment(): DynamicModule {
    if (process.env.NODE_ENV === 'production') {
      return { module: ApiIndexModule };
    }
    return {
      module: ApiIndexModule,
      imports: [DiscoveryModule],
      controllers: [ApiIndexController],
      providers: [ApiEndpointsService],
    };
  }
}
