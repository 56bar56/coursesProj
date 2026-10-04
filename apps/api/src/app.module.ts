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
import { PaymentsModule } from './payments/payments.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { BookingsModule } from './bookings/bookings.module';
import { MentorsModule } from './mentors/mentors.module';
import { InstructorCoursesModule } from './instructor-courses/instructor-courses.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { AiChatModule } from './ai-chat/ai-chat.module';
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
    BookingsModule,
    PaymentsModule,
    QuizzesModule,
    MentorsModule,
    InstructorCoursesModule,
    ReviewsModule,
    AdminModule,
    AiChatModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
