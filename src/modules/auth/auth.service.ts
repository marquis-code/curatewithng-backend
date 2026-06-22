import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole, JwtPayload } from '../../shared/types';
import { RedisCacheService } from '../../shared/cache/cache.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cacheService: RedisCacheService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
    });

    const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Check if token is blacklisted
      const isBlacklisted = await this.cacheService.get(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      const user = await this.usersService.findById(payload.sub);
      const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string) {
    // Blacklist the refresh token
    const ttl = 7 * 24 * 60 * 60; // 7 days
    await this.cacheService.set(`blacklist:${refreshToken}`, 'true', ttl);
    return { message: 'Logged out successfully' };
  }

  async firebaseGoogleLogin(firebaseIdToken: string) {
    let decodedToken;
    try {
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      }
      decodedToken = await admin.auth().verifyIdToken(firebaseIdToken);
    } catch (error) {
      throw new UnauthorizedException('Invalid Firebase ID token');
    }

    const { email, name, picture, uid } = decodedToken;
    
    if (!email) {
      throw new UnauthorizedException('No email found in token');
    }

    const [firstName, ...lastNames] = (name || '').split(' ');
    const lastName = lastNames.join(' ');

    let user = await this.usersService.findByGoogleId(uid);

    if (!user) {
      user = await this.usersService.findByEmail(email);
      if (user) {
        // Link Google account to existing user
        user.googleId = uid;
        if (!user.avatar && picture) {
          user.avatar = picture;
        }
        await user.save();
      } else {
        // Create new user
        user = await this.usersService.create({
          email: email,
          googleId: uid,
          firstName: firstName || 'Google',
          lastName: lastName || 'User',
          avatar: picture,
          isVerified: true,
        });
      }
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email, user.role);
    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
      ...tokens,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = this.jwtService.sign(
      { sub: user._id, type: 'password-reset' },
      { expiresIn: '1h', secret: this.configService.get<string>('JWT_SECRET') },
    );

    // Store reset token in Redis
    await this.cacheService.set(`reset:${user._id}`, resetToken, 3600);

    // TODO: Queue email via BullMQ
    // For now, return the token (in production, send via email only)
    return { message: 'If the email exists, a reset link has been sent', resetToken };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.type !== 'password-reset') {
        throw new BadRequestException('Invalid reset token');
      }

      // Verify token is still in Redis (single-use)
      const storedToken = await this.cacheService.get<string>(`reset:${payload.sub}`);
      if (storedToken !== token) {
        throw new BadRequestException('Reset token has expired or been used');
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await this.usersService.update(payload.sub, { passwordHash } as any);
      await this.cacheService.del(`reset:${payload.sub}`);

      return { message: 'Password reset successfully' };
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async verifyEmail(userId: string) {
    await this.usersService.setVerified(userId);
    return { message: 'Email verified successfully' };
  }

  private async generateTokens(userId: string, email: string, role: UserRole) {
    const payload: JwtPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d'),
      }),
    ]);

    // Store session data in Redis
    await this.cacheService.set(
      `session:${userId}`,
      { email, role, lastLogin: new Date().toISOString() },
      7 * 24 * 60 * 60,
    );

    return { accessToken, refreshToken };
  }
}
