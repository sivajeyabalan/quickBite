import { Controller, Get, Post, Body, HttpCode, HttpStatus, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorators';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './decorators/current.decorators';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

const isProduction = process.env.NODE_ENV === 'production';
const refreshCookieSameSite: 'none' | 'lax' = isProduction ? 'none' : 'lax';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: refreshCookieSameSite,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'Returns user + access_token; sets refresh_token cookie' })
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, ...data } = await this.authService.register(dto);
    res.cookie('refresh_token', refresh_token, REFRESH_COOKIE_OPTIONS);
    return { data, message: 'Registered successfully', statusCode: 201 };
  }

  @ApiOperation({ summary: 'Login with email & password' })
  @ApiResponse({ status: 200, description: 'Returns user + access_token; sets refresh_token cookie' })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refresh_token, ...data } = await this.authService.login(dto);
    res.cookie('refresh_token', refresh_token, REFRESH_COOKIE_OPTIONS);
    return { data, message: 'Login successful', statusCode: 200 };
  }

  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiBearerAuth('access-token')
  @Get('me')
  getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }

  @ApiOperation({ summary: 'Get a new access token using refresh_token cookie' })
  @ApiCookieAuth('refresh_token')
  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@CurrentUser() user: any) {
    return this.authService.refresh(user.id, user.email, user.role);
  }

  @ApiOperation({ summary: 'Logout — invalidates refresh token and clears cookie' })
  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.id);
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: refreshCookieSameSite,
    });
    return { message: 'Logged out successfully', statusCode: 200 };
  }
}
