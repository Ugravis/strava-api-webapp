import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import { BadgeParamsDto } from './badge-params.dto';
import {
  type BadgeDetails,
  DistancesService,
  type DistancesOverview,
} from './distances.service';
import { ReorderPinsDto } from './reorder-pins.dto';

/** Compares the cumulated distances of the user to known distances. */
@Controller('distances')
export class DistancesController {
  constructor(private readonly distances: DistancesService) {}

  @Get()
  overview(@CurrentUser() user: User): Promise<DistancesOverview> {
    return this.distances.overview(user.id);
  }

  /** A badge with every completion of the user and the next one estimated. */
  @Get('badges/:id')
  details(
    @CurrentUser() user: User,
    @Param() { id }: BadgeParamsDto,
  ): Promise<BadgeDetails> {
    return this.distances.details(user.id, id);
  }

  @Put('badges/:id/pin')
  @HttpCode(204)
  pin(
    @CurrentUser() user: User,
    @Param() { id }: BadgeParamsDto,
  ): Promise<void> {
    return this.distances.pin(user.id, id);
  }

  @Delete('badges/:id/pin')
  @HttpCode(204)
  unpin(
    @CurrentUser() user: User,
    @Param() { id }: BadgeParamsDto,
  ): Promise<void> {
    return this.distances.unpin(user.id, id);
  }

  /** Ranks the pinned badges of the user in the given order. */
  @Put('pins')
  @HttpCode(204)
  reorderPins(
    @CurrentUser() user: User,
    @Body() { badgeIds }: ReorderPinsDto,
  ): Promise<void> {
    return this.distances.reorderPins(user.id, badgeIds);
  }
}
