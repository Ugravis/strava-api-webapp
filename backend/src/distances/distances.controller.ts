import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import { BadgeHistoryQueryDto } from './badge-history-query.dto';
import { BadgeParamsDto } from './badge-params.dto';
import type { BadgeCompletion } from './distance-progress';
import {
  type BadgeDetails,
  DistancesService,
  type DistancesOverview,
} from './distances.service';
import { ReorderFavoritesDto } from './reorder-favorites.dto';

/** Compares the cumulated distances of the user to known distances. */
@Controller('distances')
export class DistancesController {
  constructor(private readonly distances: DistancesService) {}

  @Get()
  overview(@CurrentUser() user: User): Promise<DistancesOverview> {
    return this.distances.overview(user.id);
  }

  /** A badge with its latest completions by the user and the next one estimated. */
  @Get('badges/:id')
  details(
    @CurrentUser() user: User,
    @Param() { id }: BadgeParamsDto,
  ): Promise<BadgeDetails> {
    return this.distances.details(user.id, id);
  }

  /** A page of the completions of a badge, the latest first. */
  @Get('badges/:id/history')
  history(
    @CurrentUser() user: User,
    @Param() { id }: BadgeParamsDto,
    @Query() { offset }: BadgeHistoryQueryDto,
  ): Promise<BadgeCompletion[]> {
    return this.distances.history(user.id, id, offset);
  }

  @Put('badges/:id/favorite')
  @HttpCode(204)
  addFavorite(
    @CurrentUser() user: User,
    @Param() { id }: BadgeParamsDto,
  ): Promise<void> {
    return this.distances.addFavorite(user.id, id);
  }

  @Delete('badges/:id/favorite')
  @HttpCode(204)
  removeFavorite(
    @CurrentUser() user: User,
    @Param() { id }: BadgeParamsDto,
  ): Promise<void> {
    return this.distances.removeFavorite(user.id, id);
  }

  /** Ranks the favorite badges of the user in the given order. */
  @Put('favorites')
  @HttpCode(204)
  reorderFavorites(
    @CurrentUser() user: User,
    @Body() { badgeIds }: ReorderFavoritesDto,
  ): Promise<void> {
    return this.distances.reorderFavorites(user.id, badgeIds);
  }
}
