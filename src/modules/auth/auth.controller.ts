import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    
    if ('requiresOtp' in result) {
      return result;
    }

    const authResult = result as any;
    this.setAuthCookies(res, authResult.accessToken, authResult.refreshToken);
    return { user: authResult.user, accessToken: authResult.accessToken };
  }

  @Post('verify-admin-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify Admin OTP for login' })
  async verifyAdminOtp(@Body('email') email: string, @Body('otp') otp: string, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.verifyAdminOtp(email, otp);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return { error: 'No refresh token provided' };
    }
    const tokens = await this.authService.refreshToken(refreshToken);
    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    return { message: 'Logged out successfully' };
  }

  @Post('firebase/google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with Firebase Google ID Token' })
  async firebaseGoogleLogin(
    @Body('token') token: string,
    @Res({ passthrough: true }) res: Response
  ) {
    if (!token) {
      return { error: 'No token provided' };
    }
    const result = await this.authService.firebaseGoogleLogin(token);
    this.setAuthCookies(res, result.accessToken, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    return this.authService.resetPassword(token, password);
  }

  @Post('verify-email')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  async verifyEmail(@CurrentUser('sub') userId: string) {
    return this.authService.verifyEmail(userId);
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax', // Lax is better for local dev with different ports
      maxAge: 60 * 60 * 1000, // 1 hour (match your JWT_EXPIRY if possible, or leave generous)
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }
}
