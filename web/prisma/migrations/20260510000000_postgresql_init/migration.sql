-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SystemRecommendation" AS ENUM ('APPROVE', 'REVIEW', 'NOT_RECOMMENDED');

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "answersJson" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "securityLevel" TEXT NOT NULL,
    "recommendation" "SystemRecommendation" NOT NULL,
    "analysisFactorsJson" TEXT NOT NULL,
    "adminNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);
