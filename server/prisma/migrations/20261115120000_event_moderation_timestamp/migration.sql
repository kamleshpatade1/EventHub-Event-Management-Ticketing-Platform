ALTER TABLE "Event" ADD COLUMN "moderatedAt" TIMESTAMPTZ(3);

UPDATE "Event"
SET "moderatedAt" = "hiddenAt"
WHERE "hiddenAt" IS NOT NULL;
