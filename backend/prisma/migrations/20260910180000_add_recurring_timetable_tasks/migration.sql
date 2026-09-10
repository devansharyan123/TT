ALTER TABLE "Task" ADD COLUMN "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Task" ADD COLUMN "weekday" INTEGER;

UPDATE "Task"
SET "isRecurring" = true,
    "weekday" = EXTRACT(ISODOW FROM "date")::integer - 1
WHERE "date" >= date_trunc('week', CURRENT_DATE)
  AND "date" < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days';

CREATE INDEX "Task_userId_sectionId_isRecurring_weekday_idx"
ON "Task"("userId", "sectionId", "isRecurring", "weekday");