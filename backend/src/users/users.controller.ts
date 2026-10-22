import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { ApiErrorCode, ApiErrors } from '../common/api-error';
import { AVATAR_MAX_UPLOAD_BYTES, AvatarsService } from './avatars.service';
import { type CitySuggestion, CitySearchService } from './city-search.service';
import { SearchCitiesQueryDto } from './dto/search-cities.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsernameAvailabilityQueryDto } from './dto/username-availability.dto';
import { toUserResponse, type UserResponse } from './dto/user-response';
import type { User } from './user.entity';
import { type UsernameAvailability, UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly avatars: AvatarsService,
    private readonly cities: CitySearchService,
  ) {}

  /** Cities matching a name, to pick the one of the profile. */
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Get('cities')
  searchCities(
    @Query() { q }: SearchCitiesQueryDto,
  ): Promise<CitySuggestion[]> {
    return this.cities.search(q);
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('username-availability')
  usernameAvailability(
    @Query() query: UsernameAvailabilityQueryDto,
  ): Promise<UsernameAvailability> {
    return this.users.checkUsername(query.username);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponse> {
    return toUserResponse(await this.users.updateProfile(user, dto));
  }

  @Put('me/avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: AVATAR_MAX_UPLOAD_BYTES, files: 1 },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<UserResponse> {
    if (!file) {
      throw ApiErrors.badRequest(
        ApiErrorCode.InvalidImage,
        'An image file is required',
      );
    }
    await this.avatars.upload(user, file.buffer);
    return toUserResponse(user);
  }

  @Delete('me/avatar')
  @HttpCode(HttpStatus.OK)
  async removeAvatar(@CurrentUser() user: User): Promise<UserResponse> {
    await this.avatars.remove(user);
    return toUserResponse(user);
  }
}
