-- CreateTable
CREATE TABLE "early_bird_registrations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "whatsapp_number" TEXT NOT NULL,
    "email" TEXT,
    "town_or_city" TEXT NOT NULL,
    "age_group" TEXT NOT NULL,
    "interests" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "early_bird_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "early_bird_registrations_whatsapp_number_key" ON "early_bird_registrations"("whatsapp_number");

-- CreateIndex
CREATE INDEX "early_bird_registrations_created_at_idx" ON "early_bird_registrations"("created_at");
