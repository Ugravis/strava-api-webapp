import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/user.entity';
import { type TileStats, TilesService } from './tiles.service';

export interface TilesResponse {
  /** `[x, y, mask]`: a large tile (zoom 14) and its small tiles as an unsigned 64-bit decimal mask. */
  cells: [number, number, string][];
}

@Controller('tiles')
export class TilesController {
  constructor(private readonly tiles: TilesService) {}

  /** Every tile crossed by the user, including the areas hidden to others. */
  @Get()
  async list(@CurrentUser() user: User): Promise<TilesResponse> {
    const cells = await this.tiles.cells(user.id);
    return { cells: cells.map(({ x, y, mask }) => [x, y, mask.toString()]) };
  }

  @Get('stats')
  stats(@CurrentUser() user: User): Promise<TileStats> {
    return this.tiles.stats(user.id);
  }
}
