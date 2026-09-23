import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { LessonsModule } from './lessons/lessons.module';
import { ProgressModule } from './progress/progress.module';
import { StorageModule } from './storage/storage.module';
import { AppController } from './app.controller';
import { validateEnv } from './config/env.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    EnrollmentsModule,
    LessonsModule,
    ProgressModule,
    StorageModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
