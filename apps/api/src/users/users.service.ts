import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Role } from '../generated/prisma/enums';
import type { UpdateProfileDto } from './dto/update-profile.dto';

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  locale: true,
  roles: true,
  emailVerified: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_USER_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: PUBLIC_USER_SELECT,
    });
  }

  async updateRoles(id: string, roles: Role[]) {
    await this.findPublicById(id);
    return this.prisma.user.update({
      where: { id },
      data: { roles },
      select: PUBLIC_USER_SELECT,
    });
  }
}
