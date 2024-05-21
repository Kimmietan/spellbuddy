const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.word.deleteMany();
  await prisma.spellingList.deleteMany();
  await prisma.reward.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const user1 = await prisma.user.create({
    data: {
      email: 'user1@example.com',
      spellingLists: {
        create: [
          {
            name: 'List 1',
            words: {
              create: [
                { word: 'apple', correct: true },
                { word: 'banana', correct: false },
                { word: 'cherry', correct: true },
                { word: 'date', correct: false },
                { word: 'elderberry', correct: true },
              ],
            },
          },
          {
            name: 'List 2',
            words: {
              create: [
                { word: 'fig', correct: true },
                { word: 'grape', correct: false },
                { word: 'honeydew', correct: true },
                { word: 'kiwi', correct: false },
                { word: 'lemon', correct: true },
              ],
            },
          },
          {
            name: 'List 3',
            words: {
              create: [
                { word: 'mango', correct: true },
                { word: 'nectarine', correct: false },
                { word: 'orange', correct: true },
                { word: 'papaya', correct: false },
                { word: 'quince', correct: true },
              ],
            },
          },
        ],
      },
      rewards: {
        create: [
          { scoreRange: '100', reward: 'Ice cream' },
          { scoreRange: '60-99', reward: 'Kiss and hug' },
          { scoreRange: '<60', reward: 'Try again' },
        ],
      },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'user2@example.com',
      spellingLists: {
        create: [
          {
            name: 'List 1',
            words: {
              create: [
                { word: 'apple', correct: false },
                { word: 'banana', correct: true },
                { word: 'cherry', correct: false },
                { word: 'date', correct: true },
                { word: 'elderberry', correct: false },
              ],
            },
          },
          {
            name: 'List 2',
            words: {
              create: [
                { word: 'fig', correct: false },
                { word: 'grape', correct: true },
                { word: 'honeydew', correct: false },
                { word: 'kiwi', correct: true },
                { word: 'lemon', correct: false },
              ],
            },
          },
          {
            name: 'List 3',
            words: {
              create: [
                { word: 'mango', correct: false },
                { word: 'nectarine', correct: true },
                { word: 'orange', correct: false },
                { word: 'papaya', correct: true },
                { word: 'quince', correct: false },
              ],
            },
          },
        ],
      },
      rewards: {
        create: [
          { scoreRange: '100', reward: 'Toy' },
          { scoreRange: '60-99', reward: 'Candy' },
          { scoreRange: '<60', reward: 'Encouragement' },
        ],
      },
    },
  });

  console.log({ user1, user2 });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
