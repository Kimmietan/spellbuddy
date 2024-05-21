/*
  Warnings:

  - Added the required column `correct` to the `Word` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
-- ALTER TABLE "Word" ADD COLUMN     "correct" BOOLEAN NOT NULL;
-- This is an example of how your migration file might look
-- After you locate the migration file, you will see SQL statements like the following
ALTER TABLE "Word" ADD COLUMN "correct" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Reward" (
    "id" SERIAL NOT NULL,
    "scoreRange" TEXT NOT NULL,
    "reward" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;



