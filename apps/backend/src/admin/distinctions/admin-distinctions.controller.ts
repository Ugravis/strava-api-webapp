import type { AdminDistinction } from '@kilotrace/shared/admin';
import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { AdminController } from '../access/admin-controller.decorator';
import { AnyMember, Permission } from '../access/permission.decorator';
import { Audited } from '../audit/audited.decorator';
import { ReorderDto } from '../badges/admin-badges.dto';
import {
  CreateDistinctionDto,
  UpdateDistinctionDto,
} from './admin-distinctions.dto';
import { AdminDistinctionsService } from './admin-distinctions.service';

const DISTINCTION = { type: 'distinction', param: 'id' };

/** The distinctions, badges owed to the membership: every member reads, the permissions act. */
@AdminController('distinctions')
export class AdminDistinctionsController {
  constructor(private readonly distinctions: AdminDistinctionsService) {}

  @Get()
  @AnyMember()
  catalog(): Promise<AdminDistinction[]> {
    return this.distinctions.catalog();
  }

  @Post()
  @Permission('distinctions.create')
  @Audited({ action: 'distinctions.create', details: ['id', 'name'] })
  @HttpCode(HttpStatus.NO_CONTENT)
  create(@Body() dto: CreateDistinctionDto): Promise<void> {
    return this.distinctions.create(dto);
  }

  /** Declared before `:id`, which would take `order` for an id. */
  @Put('order')
  @Permission('distinctions.edit')
  @Audited({ action: 'distinctions.reorder' })
  @HttpCode(HttpStatus.NO_CONTENT)
  reorder(@Body() dto: ReorderDto): Promise<void> {
    return this.distinctions.reorder(dto.ids);
  }

  @Patch(':id')
  @Permission('distinctions.edit')
  @Audited({
    action: 'distinctions.update',
    target: DISTINCTION,
    details: ['name'],
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDistinctionDto,
  ): Promise<void> {
    return this.distinctions.update(id, dto);
  }

  @Delete(':id')
  @Permission('distinctions.delete')
  @Audited({
    action: 'distinctions.delete',
    target: DISTINCTION,
    destructive: true,
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string): Promise<void> {
    return this.distinctions.delete(id);
  }
}
