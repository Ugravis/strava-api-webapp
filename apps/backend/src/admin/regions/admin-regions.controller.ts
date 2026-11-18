import type { AdminRegion, AdminRegionsList } from '@kilotrace/shared/admin';
import { Get, Param } from '@nestjs/common';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember } from '../access/permission.decorator';
import { AdminRegionsService } from './admin-regions.service';

/** The regions of the dataset: every member reads them, nobody changes them. */
@AdminController('regions')
export class AdminRegionsController {
  constructor(private readonly regions: AdminRegionsService) {}

  /** All of them at once: a few hundred, searched by their names in the browser. */
  @Get()
  @AnyMember()
  list(): Promise<AdminRegionsList> {
    return this.regions.list();
  }

  @Get(':code')
  @AnyMember()
  region(@Param('code') code: string): Promise<AdminRegion> {
    return this.regions.region(code);
  }
}
