import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './modules/users/users.service';
import { UserRole } from './shared/types';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  console.log('Seeding initial data...');

  // Create admin user
  try {
    await usersService.create({
      email: 'admin@curatewithng.com',
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      phone: '+2348000000000',
      isVerified: true,
      isActive: true,
    });
    console.log('Admin user created successfully.');
  } catch (error: any) {
    if (error.code === 11000) {
      console.log('Admin user already exists.');
    } else {
      console.error('Failed to create admin user:', error.message);
    }
  }

  console.log('Seeding complete.');
  await app.close();
}

bootstrap();
