import 'dotenv/config';
import { hash } from '@node-rs/argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { createWriteStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { PrismaClient } from '../src/generated/prisma/client';
import { Role, CourseStatus, LessonType } from '../src/generated/prisma/enums';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const HASH_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
const STORAGE_DIR = resolve(process.env.LOCAL_STORAGE_DIR ?? './local-uploads');
const SAMPLE_VIDEO_URL =
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';

async function seedUser(
  email: string | undefined,
  password: string | undefined,
  displayName: string,
  roles: Role[],
): Promise<string | null> {
  if (!email || !password) {
    console.log(`${displayName} email/password not set, skipping ${displayName.toLowerCase()} seed.`);
    return null;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`${displayName} user ${email} already exists, skipping.`);
    return existing.id;
  }

  const passwordHash = await hash(password, HASH_OPTIONS);
  const user = await prisma.user.create({
    data: { email, passwordHash, displayName, roles, emailVerified: true },
  });
  console.log(`Seeded ${displayName.toLowerCase()} user: ${email}`);
  return user.id;
}

async function downloadSampleVideo(): Promise<{ fileName: string; sizeBytes: number } | null> {
  const videosDir = join(STORAGE_DIR, 'videos');
  const fileName = 'sample-lesson.mp4';
  const filePath = join(videosDir, fileName);

  if (existsSync(filePath)) {
    return { fileName, sizeBytes: statSync(filePath).size };
  }

  mkdirSync(videosDir, { recursive: true });

  try {
    const res = await fetch(SAMPLE_VIDEO_URL);
    if (!res.ok || !res.body) {
      throw new Error(`HTTP ${res.status}`);
    }
    await pipeline(Readable.fromWeb(res.body as never), createWriteStream(filePath));
    const sizeBytes = statSync(filePath).size;
    console.log(`Downloaded sample lesson video (${sizeBytes} bytes).`);
    return { fileName, sizeBytes };
  } catch (err) {
    console.warn(
      `Could not download the sample lesson video (${(err as Error).message}). ` +
        `The video lesson will 404 until a file is placed at ${filePath} manually, or the seed is re-run with network access.`,
    );
    return null;
  }
}

function writeSampleResource(): { fileName: string; sizeBytes: number } {
  const resourcesDir = join(STORAGE_DIR, 'resources');
  mkdirSync(resourcesDir, { recursive: true });
  const fileName = 'cheat-sheet.txt';
  const filePath = join(resourcesDir, fileName);
  const content =
    'Quick reference: functions, graphs, and the basics you need before your first university math course.\n\n' +
    '(placeholder content for the seeded free course)\n';
  writeFileSync(filePath, content, 'utf-8');
  return { fileName, sizeBytes: Buffer.byteLength(content, 'utf-8') };
}

async function seedFreeCourse(instructorId: string) {
  const slug = 'intro-to-university-math';
  const existing = await prisma.course.findUnique({ where: { slug } });
  if (existing) {
    console.log(`Course "${slug}" already exists, skipping.`);
    return;
  }

  const video = await downloadSampleVideo();
  const resource = writeSampleResource();

  await prisma.course.create({
    data: {
      slug,
      title: 'Intro to University Math',
      description:
        'A free primer covering the math fundamentals you need before your first university course, ' +
        'taught by someone who took this path recently.',
      category: 'math',
      language: 'en',
      priceCents: 0,
      currency: 'USD',
      status: CourseStatus.PUBLISHED,
      ownerInstructorId: instructorId,
      modules: {
        create: [
          {
            title: 'Getting Started',
            order: 10,
            lessons: {
              create: [
                {
                  type: LessonType.VIDEO,
                  title: 'Welcome to the course',
                  order: 10,
                  storageKey: video?.fileName ?? null,
                  fileName: video?.fileName ?? null,
                  mimeType: video ? 'video/mp4' : null,
                  sizeBytes: video?.sizeBytes ?? null,
                  durationSec: 10,
                },
                {
                  type: LessonType.TEXT,
                  title: 'How this course works',
                  order: 20,
                  textContent:
                    'This course is free and self-paced. Work through each module in order, ' +
                    'mark lessons complete as you go, and use the cheat sheet in the next module for a quick reference.',
                },
              ],
            },
          },
          {
            title: 'Foundations',
            order: 20,
            lessons: {
              create: [
                {
                  type: LessonType.TEXT,
                  title: 'Functions and graphs',
                  order: 10,
                  textContent:
                    'A function assigns exactly one output to each input. We will build up graphing intuition ' +
                    'from linear functions through to basic polynomials over the next few lessons.',
                },
                {
                  type: LessonType.RESOURCE,
                  title: 'Formula cheat sheet',
                  order: 20,
                  storageKey: resource.fileName,
                  fileName: resource.fileName,
                  mimeType: 'text/plain',
                  sizeBytes: resource.sizeBytes,
                },
                {
                  type: LessonType.QUIZ,
                  title: 'Check your understanding',
                  order: 30,
                  quiz: {
                    create: {
                      questions: {
                        create: [
                          {
                            order: 10,
                            type: 'MULTIPLE_CHOICE',
                            text: 'What is the slope of the line y = 2x + 3?',
                            options: ['1', '2', '3', '-2'],
                            correctOptionIndex: 1,
                            explanation: 'The slope is the coefficient of x, which is 2.',
                          },
                          {
                            order: 20,
                            type: 'NUMERIC_ENTRY',
                            text: 'What is f(4) if f(x) = x^2 - 1?',
                            options: [],
                            correctNumericAnswer: '15',
                            explanation: 'f(4) = 4^2 - 1 = 16 - 1 = 15.',
                          },
                          {
                            order: 30,
                            type: 'MULTIPLE_CHOICE',
                            text: 'Which of these is a quadratic function?',
                            options: ['y = 2x + 1', 'y = x^2 + 1', 'y = 1/x', 'y = 3'],
                            correctOptionIndex: 1,
                            explanation: 'A quadratic function has an x^2 term.',
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Seeded course: ${slug}`);
}

async function seedPaidCourse(instructorId: string) {
  const slug = 'psychometric-verbal-crash-course';
  const existing = await prisma.course.findUnique({ where: { slug } });
  if (existing) {
    console.log(`Course "${slug}" already exists, skipping.`);
    return;
  }

  await prisma.course.create({
    data: {
      slug,
      title: 'Psychometric Verbal Crash Course',
      description:
        'A focused, paid crash course on the verbal reasoning section of the psychometric exam, ' +
        'covering strategy and worked examples.',
      category: 'psychometric',
      language: 'en',
      priceCents: 4900,
      currency: 'USD',
      status: CourseStatus.PUBLISHED,
      ownerInstructorId: instructorId,
      modules: {
        create: [
          {
            title: 'Verbal Reasoning Basics',
            order: 10,
            lessons: {
              create: [
                {
                  type: LessonType.TEXT,
                  title: 'How the verbal section is scored',
                  order: 10,
                  textContent:
                    'The verbal section tests analogies, sentence completion, and reading comprehension. ' +
                    'This crash course focuses on the patterns that come up most often.',
                },
                {
                  type: LessonType.QUIZ,
                  title: 'Timed practice set',
                  order: 20,
                  quiz: {
                    create: {
                      timeLimitSec: 300,
                      questions: {
                        create: [
                          {
                            order: 10,
                            type: 'MULTIPLE_CHOICE',
                            text: 'BOOK is to READ as KNIFE is to ___',
                            options: ['Cook', 'Cut', 'Sharpen', 'Kitchen'],
                            correctOptionIndex: 1,
                            explanation:
                              'A book is used to read; a knife is used to cut. The relationship is object-to-primary-function.',
                          },
                          {
                            order: 20,
                            type: 'MULTIPLE_CHOICE',
                            text:
                              'Choose the word that best completes the sentence: The lecture was so ___ that half the class fell asleep.',
                            options: ['engaging', 'tedious', 'brief', 'controversial'],
                            correctOptionIndex: 1,
                            explanation: '"Tedious" (boring) best explains why students fell asleep.',
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Seeded course: ${slug}`);
}

async function seedMentorAvailability(mentorId: string) {
  const existing = await prisma.mentorAvailability.findFirst({ where: { mentorId } });
  if (existing) {
    console.log('Mentor availability already seeded, skipping.');
    return;
  }

  const slots = [];
  const now = new Date();
  for (let day = 1; day <= 10; day++) {
    // Two 30-minute slots per day, mid-morning and mid-afternoon, over the next 10 days.
    for (const hour of [10, 15]) {
      const startAt = new Date(now);
      startAt.setDate(startAt.getDate() + day);
      startAt.setHours(hour, 0, 0, 0);
      const endAt = new Date(startAt.getTime() + 30 * 60 * 1000);
      slots.push({ mentorId, startAt, endAt, priceCents: 6000, currency: 'USD' });
    }
  }

  await prisma.mentorAvailability.createMany({ data: slots });
  console.log(`Seeded ${slots.length} mentor availability slots.`);
}

async function main() {
  await seedUser(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD, 'Admin', [Role.ADMIN]);

  const instructorId = await seedUser(
    process.env.SEED_INSTRUCTOR_EMAIL,
    process.env.SEED_INSTRUCTOR_PASSWORD,
    'Instructor',
    [Role.INSTRUCTOR],
  );

  if (instructorId) {
    await seedFreeCourse(instructorId);
    await seedPaidCourse(instructorId);
  } else {
    console.log('No instructor seeded, skipping course seed (Course.ownerInstructorId is required).');
  }

  const mentorId = await seedUser(
    process.env.SEED_MENTOR_EMAIL,
    process.env.SEED_MENTOR_PASSWORD,
    'Mentor',
    [Role.MENTOR],
  );

  if (mentorId) {
    await seedMentorAvailability(mentorId);
  } else {
    console.log('No mentor seeded, skipping availability seed.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
