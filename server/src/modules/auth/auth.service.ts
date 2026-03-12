import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name, phone: dto.phone },
    });

    const tokens = await this.signTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refresh_token);
    return { user: this.sanitize(user), access_token: tokens.access_token, refresh_token: tokens.refresh_token };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.signTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(user.id, tokens.refresh_token);
    return { user: this.sanitize(user), access_token: tokens.access_token, refresh_token: tokens.refresh_token };
  }

  async refresh(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    type Expiry = `${number}${'s' | 'm' | 'h' | 'd'}`;
    const access_token = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
      expiresIn: (this.config.get<string>('ACCESS_TOKEN_EXPIRES_IN', '15m')) as Expiry,
    });
    return { access_token };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.sanitize(user);
  }

  private async signTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    type Expiry = `${number}${'s' | 'm' | 'h' | 'd'}`;
    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
        expiresIn: (this.config.get<string>('ACCESS_TOKEN_EXPIRES_IN', '15m')) as Expiry,
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: (this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d')) as Expiry,
      }),
    ]);
    return { access_token, refresh_token };
  }

  private async saveRefreshToken(userId: string, token: string) {
    const hashed = await bcrypt.hash(token, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: hashed } });
  }

  private sanitize(user: any) {
    const { passwordHash, refreshToken, ...safe } = user;
    return safe;
  }
}
