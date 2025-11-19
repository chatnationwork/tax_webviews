-- CreateTable
CREATE TABLE "visitedCountires" (
    "id" SERIAL NOT NULL,
    "country" JSONB NOT NULL,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visitedCountires_pkey" PRIMARY KEY ("id")
);
