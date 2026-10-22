import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderConnection } from './provider-connection.entity';
import { SyncJob } from './sync-job.entity';
import { SyncJobsService } from './sync-jobs.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderConnection, SyncJob])],
  providers: [SyncJobsService],
  exports: [TypeOrmModule, SyncJobsService],
})
export class ConnectionsModule {}
