/*
  Warnings:

  - The `file` column on the `SavedItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "SavedItem" DROP COLUMN "file",
ADD COLUMN     "file" JSONB[];
