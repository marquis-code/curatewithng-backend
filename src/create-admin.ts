import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './modules/users/users.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from './shared/types';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const email = 'usisangozi@gmail.com';
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 12);

  let admin = await usersService.findByEmail(email);
  
  if (admin) {
    console.log('Admin already exists. Updating password, role, and verification status...');
    admin.passwordHash = passwordHash;
    admin.role = UserRole.ADMIN;
    admin.isVerified = true;
    admin.isActive = true;
    await admin.save();
  } else {
    console.log('Creating new Admin...');
    admin = await usersService.create({
      email,
      passwordHash,
      firstName: 'Usisangozi',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      isVerified: true,
      isActive: true,
    });
  }

  console.log(`\n================================`);
  console.log(`SUCCESS! Admin User Generated.`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`================================\n`);

  await app.close();
}

bootstrap();
