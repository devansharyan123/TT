-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('email_password', 'google', 'phone');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('timed', 'quantity');

-- CreateEnum
CREATE TYPE "TimerState" AS ENUM ('idle', 'running', 'paused', 'break', 'done');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "displayName" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "allocatedMinutes" INTEGER,
    "elapsedSeconds" INTEGER NOT NULL DEFAULT 0,
    "timerState" "TimerState" NOT NULL DEFAULT 'idle',
    "targetQuantity" INTEGER,
    "currentQuantity" INTEGER NOT NULL DEFAULT 0,
    "unit" TEXT,
    "scheduledTime" TEXT,
    "endTime" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 0,
    "best" INTEGER NOT NULL DEFAULT 0,
    "streakSaves" INTEGER NOT NULL DEFAULT 0,
    "consecutiveSuccessDays" INTEGER NOT NULL DEFAULT 0,
    "lastSaveUsedDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SectionStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "completedTasks" INTEGER NOT NULL DEFAULT 0,
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "saveUsed" BOOLEAN NOT NULL DEFAULT false,
    "previousDayPercent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskMetricDaily" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "taskTitle" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "completionPercent" INTEGER NOT NULL DEFAULT 0,
    "targetValue" INTEGER,
    "actualValue" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskMetricDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT,
    "sectionId" TEXT,
    "eventName" TEXT NOT NULL,
    "eventCategory" TEXT,
    "path" TEXT,
    "sessionId" TEXT,
    "metadata" JSONB,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "eventAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "AuthAccount_userId_idx" ON "AuthAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthAccount_provider_providerUserId_key" ON "AuthAccount"("provider", "providerUserId");

-- CreateIndex
CREATE INDEX "TaskSection_userId_isArchived_idx" ON "TaskSection"("userId", "isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSection_userId_name_key" ON "TaskSection"("userId", "name");

-- CreateIndex
CREATE INDEX "Task_userId_sectionId_date_idx" ON "Task"("userId", "sectionId", "date");

-- CreateIndex
CREATE INDEX "Task_sectionId_date_idx" ON "Task"("sectionId", "date");

-- CreateIndex
CREATE INDEX "Task_sectionId_title_idx" ON "Task"("sectionId", "title");

-- CreateIndex
CREATE INDEX "SectionStreak_sectionId_idx" ON "SectionStreak"("sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionStreak_userId_sectionId_key" ON "SectionStreak"("userId", "sectionId");

-- CreateIndex
CREATE INDEX "DailyMetric_userId_date_idx" ON "DailyMetric"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMetric_sectionId_date_key" ON "DailyMetric"("sectionId", "date");

-- CreateIndex
CREATE INDEX "TaskMetricDaily_sectionId_date_idx" ON "TaskMetricDaily"("sectionId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TaskMetricDaily_sectionId_taskTitle_date_key" ON "TaskMetricDaily"("sectionId", "taskTitle", "date");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventName_eventAt_idx" ON "AnalyticsEvent"("eventName", "eventAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_eventAt_idx" ON "AnalyticsEvent"("userId", "eventAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_sectionId_eventAt_idx" ON "AnalyticsEvent"("sectionId", "eventAt");

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSection" ADD CONSTRAINT "TaskSection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TaskSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionStreak" ADD CONSTRAINT "SectionStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionStreak" ADD CONSTRAINT "SectionStreak_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TaskSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TaskSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMetricDaily" ADD CONSTRAINT "TaskMetricDaily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskMetricDaily" ADD CONSTRAINT "TaskMetricDaily_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TaskSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "TaskSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
