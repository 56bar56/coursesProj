-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('OPEN', 'BOOKED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "bookingId" TEXT,
ALTER COLUMN "courseId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "mentor_availability" (
    "id" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "SlotStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mentorId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "scheduledStartAt" TIMESTAMP(3) NOT NULL,
    "scheduledEndAt" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "videoJoinUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mentor_availability_mentorId_startAt_idx" ON "mentor_availability"("mentorId", "startAt");

-- CreateIndex
CREATE INDEX "mentor_availability_status_startAt_idx" ON "mentor_availability"("status", "startAt");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_slotId_key" ON "bookings"("slotId");

-- CreateIndex
CREATE INDEX "bookings_studentId_idx" ON "bookings"("studentId");

-- CreateIndex
CREATE INDEX "bookings_mentorId_idx" ON "bookings"("mentorId");

-- CreateIndex
CREATE UNIQUE INDEX "orders_bookingId_key" ON "orders"("bookingId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_availability" ADD CONSTRAINT "mentor_availability_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "mentor_availability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

