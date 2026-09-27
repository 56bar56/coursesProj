-- DropIndex
DROP INDEX "bookings_slotId_key";

-- CreateIndex
CREATE INDEX "bookings_slotId_idx" ON "bookings"("slotId");

