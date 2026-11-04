-- AlterEnum
ALTER TYPE "TicketType" ADD VALUE 'YOUNG_READER';
ALTER TYPE "TicketType" ADD VALUE 'ELITE';
ALTER TYPE "TicketType" ADD VALUE 'KHASAK_SHOW';
ALTER TYPE "TicketType" ADD VALUE 'NEW_YEAR_EVE';

-- CreateEnum
CREATE TYPE "ShowSessionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "tickets"
  ADD COLUMN "gst_rate" DECIMAL(5,2) NOT NULL DEFAULT 18,
  ADD COLUMN "requires_date" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requires_show_session" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "min_age" INTEGER,
  ADD COLUMN "max_age" INTEGER,
  ADD COLUMN "multi_day" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "perks" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "bookings"
  ADD COLUMN "subtotal_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "gst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
-- Existing bookings were created before GST tracking: treat their total as the subtotal.
UPDATE "bookings" SET "subtotal_amount" = "total_amount";

-- AlterTable
ALTER TABLE "booking_items"
  ADD COLUMN "gst_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "gst_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "show_sessions" (
    "id" TEXT NOT NULL,
    "festival_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "venue" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "total_seats" INTEGER NOT NULL,
    "available_seats" INTEGER NOT NULL,
    "status" "ShowSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "show_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_attendees" (
    "id" TEXT NOT NULL,
    "booking_item_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "date_of_birth" DATE,
    "valid_date" DATE,
    "show_session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_check_ins" (
    "id" TEXT NOT NULL,
    "ticket_instance_id" TEXT NOT NULL,
    "check_in_date" DATE NOT NULL,
    "venue" TEXT NOT NULL DEFAULT '',
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_in_by_id" TEXT,
    CONSTRAINT "ticket_check_ins_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ticket_instances" ADD COLUMN "attendee_id" TEXT;

-- CreateIndex
CREATE INDEX "show_sessions_festival_id_idx" ON "show_sessions"("festival_id");
CREATE INDEX "show_sessions_starts_at_idx" ON "show_sessions"("starts_at");
CREATE INDEX "booking_attendees_booking_item_id_idx" ON "booking_attendees"("booking_item_id");
CREATE INDEX "booking_attendees_show_session_id_idx" ON "booking_attendees"("show_session_id");
CREATE INDEX "ticket_check_ins_check_in_date_idx" ON "ticket_check_ins"("check_in_date");
CREATE UNIQUE INDEX "ticket_check_ins_ticket_instance_id_check_in_date_venue_key" ON "ticket_check_ins"("ticket_instance_id", "check_in_date", "venue");
CREATE UNIQUE INDEX "ticket_instances_attendee_id_key" ON "ticket_instances"("attendee_id");

-- AddForeignKey
ALTER TABLE "show_sessions" ADD CONSTRAINT "show_sessions_festival_id_fkey" FOREIGN KEY ("festival_id") REFERENCES "festivals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_attendees" ADD CONSTRAINT "booking_attendees_booking_item_id_fkey" FOREIGN KEY ("booking_item_id") REFERENCES "booking_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "booking_attendees" ADD CONSTRAINT "booking_attendees_show_session_id_fkey" FOREIGN KEY ("show_session_id") REFERENCES "show_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ticket_check_ins" ADD CONSTRAINT "ticket_check_ins_ticket_instance_id_fkey" FOREIGN KEY ("ticket_instance_id") REFERENCES "ticket_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_instances" ADD CONSTRAINT "ticket_instances_attendee_id_fkey" FOREIGN KEY ("attendee_id") REFERENCES "booking_attendees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
