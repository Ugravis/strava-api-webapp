import {
  ADMIN_PERMISSION_KEYS,
  type AdminPermission,
} from '@kilotrace/shared/admin';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, ValidateNested } from 'class-validator';

export class RoleGrantsDto {
  @IsArray()
  @ArrayMaxSize(ADMIN_PERMISSION_KEYS.length)
  @IsIn(ADMIN_PERMISSION_KEYS, { each: true })
  support!: AdminPermission[];

  @IsArray()
  @ArrayMaxSize(ADMIN_PERMISSION_KEYS.length)
  @IsIn(ADMIN_PERMISSION_KEYS, { each: true })
  admin!: AdminPermission[];
}

export class SetRolePermissionsDto {
  @ValidateNested()
  @Type(() => RoleGrantsDto)
  grants!: RoleGrantsDto;
}
