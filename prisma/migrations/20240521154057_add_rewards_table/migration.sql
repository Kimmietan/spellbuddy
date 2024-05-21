/*
  Warnings:

  - A unique constraint covering the columns `[userId,scoreRange]` on the table `Reward` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Reward_userId_scoreRange_key" ON "Reward"("userId", "scoreRange");
