-- DropForeignKey
ALTER TABLE "Word" DROP CONSTRAINT "Word_spellingListId_fkey";

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_spellingListId_fkey" FOREIGN KEY ("spellingListId") REFERENCES "SpellingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
