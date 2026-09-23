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

async function seedCourse(instructorId: string) {
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
                  title: 'Check your understanding (coming soon)',
                  order: 30,
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

async function main() {
  await seedUser(process.env.SEED_ADMIN_EMAIL, process.env.SEED_ADMIN_PASSWORD, 'Admin', [Role.ADMIN]);

  const instructorId = await seedUser(
    process.env.SEED_INSTRUCTOR_EMAIL,
    process.env.SEED_INSTRUCTOR_PASSWORD,
    'Instructor',
    [Role.INSTRUCTOR],
  );

  if (instructorId) {
    await seedCourse(instructorId);
  } else {
    console.log('No instructor seeded, skipping course seed (Course.ownerInstructorId is required).');
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
