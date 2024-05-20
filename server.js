const express = require('express');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', (req, res) => {
  res.render('home');
});

app.get('/parent-dashboard', async (req, res) => {
  const lists = await prisma.spellingList.findMany({
    include: { words: true }
  });

  // Assuming you have logic to calculate the score for each list
  const listsWithScores = lists.map(list => {
    const totalWords = list.words.length;
    const correctWords = list.words.filter(word => word.correct).length; // example logic
    const score = (totalWords > 0) ? Math.round((correctWords / totalWords) * 100) : 0;
    return { ...list, score };
  });

  res.render('pdashboard', { lists: listsWithScores });
});

app.get('/child-dashboard', async (req, res) => {
  const lists = await prisma.spellingList.findMany({
    include: { words: true }
  });
  res.render('cdashboard', { lists });
});

app.post('/get-lists', async (req, res) => {
  const { email } = req.body;
  let user = await prisma.user.findUnique({
    where: { email },
    include: {
      spellingLists: {
        include: { words: true }
      }
    }
  });

  if (!user) {
    // Create a new user if the email is not found
    user = await prisma.user.create({
      data: {
        email
      }
    });
  }

  // Ensure that user.spellingLists is always an array, even if empty
  res.json(user.spellingLists || []);
});


// Route to display all users, their spelling lists, and words
app.get('/test', async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        include: {
          spellingLists: {
            include: { words: true }
          }
        }
      });
      res.render('test', { users });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
