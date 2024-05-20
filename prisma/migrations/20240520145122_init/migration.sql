-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpellingList" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpellingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" SERIAL NOT NULL,
    "spellingListId" INTEGER NOT NULL,
    "word" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "SpellingList" ADD CONSTRAINT "SpellingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_spellingListId_fkey" FOREIGN KEY ("spellingListId") REFERENCES "SpellingList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
