import { type DynamicModule, Module } from '@nestjs/common';
import { StravaModule } from '../strava/strava.module';
import { DevController } from './dev.controller';
import { DevOverviewService } from './dev-overview.service';

/**
 * Temporary development tools (database overview shown on the dashboard).
 * Never loaded in production. To remove them: delete `src/dev`, its import
 * in `AppModule` and `frontend/src/components/dev`.
 */
@Module({})
export class DevModule {
  static forEnvironment(): DynamicModule {
    if (process.env.NODE_ENV === 'production') {
      return { module: DevModule };
    }
    return {
      module: DevModule,
      imports: [StravaModule],
      controllers: [DevController],
      providers: [DevOverviewService],
    };
  }
}
