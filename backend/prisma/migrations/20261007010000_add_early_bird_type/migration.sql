-- CreateEnum
CREATE TYPE "EarlyBirdType" AS ENUM ('REGISTER', 'VOLUNTEER', 'EXHIBIT', 'PARTNER');

-- AlterTable
ALTER TABLE "early_bird_registrations" ADD COLUMN "interest_type" "EarlyBirdType" NOT NULL DEFAULT 'REGISTER';

-- CreateIndex
CREATE INDEX "early_bird_registrations_interest_type_idx" ON "early_bird_registrations"("interest_type");
