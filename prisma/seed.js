const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      email: 'user1@example.com',
      spellingLists: [
        {
          name: 'Spelling List 1',
          words: ['apple', 'banana', 'cherry', 'date', 'elderberry']
        },
        {
          name: 'Spelling List 2',
          words: ['fish', 'gorilla', 'hippo', 'iguana', 'jaguar']
        }
      ]
    },
    {
      email: 'user2@example.com',
      spellingLists: [
        {
          name: 'Spelling List 3',
          words: ['kite', 'lion', 'monkey', 'narwhal', 'octopus']
        },
        {
          name: 'Spelling List 4',
          words: ['penguin', 'quail', 'rabbit', 'snake', 'turtle']
        }
      ]
    }
  ];

  for (const userData of users) {
    await prisma.user.create({
      data: {
        email: userData.email,
        spellingLists: {
          create: userData.spellingLists.map(list => ({
            name: list.name,
            words: {
              create: list.words.map(word => ({ word }))
            }
          }))
        }
      }
    });
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
