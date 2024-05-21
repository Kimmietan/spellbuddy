const express = require('express');
const session = require('express-session');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

app.get('/', (req, res) => {
  res.render('home');
});

app.post('/get-lists', async (req, res) => {
  const { email } = req.body;
  req.session.email = email;

  let user = await prisma.user.findUnique({
    where: { email },
    include: {
      spellingLists: {
        include: { words: true }
      }
    }
  });

  if (!user) {
    user = await prisma.user.create({
      data: { email }
    });
  }

  res.json(user.spellingLists || []);
});

app.get('/parent-dashboard', async (req, res) => {
  const email = req.session.email;
  if (!email) return res.redirect('/');

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      spellingLists: {
        include: { words: true }
      },
      rewards: true
    }
  });

  const listsWithScores = user.spellingLists.map(list => {
    const totalWords = list.words.length;
    const correctWords = list.words.filter(word => word.correct).length;
    const score = totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0;
    return { ...list, score };
  });

  res.render('pdashboard', { lists: listsWithScores, rewards: user.rewards, email });
});

app.get('/child-dashboard', async (req, res) => {
  const email = req.session.email;
  if (!email) return res.redirect('/');

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      spellingLists: {
        include: { words: true }
      }
    }
  });

  res.render('cdashboard', { lists: user.spellingLists });
});

app.post('/save-list', async (req, res) => {
  const email = req.session.email;
  if (!email) return res.status(403).json({ success: false, error: 'Unauthorized' });

  const { listName, words } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    const newList = await prisma.spellingList.create({
      data: {
        name: listName,
        user: { connect: { id: user.id } },
        words: {
          create: words.map(word => ({ word, correct: false }))
        }
      }
    });

    res.json({ success: true, list: newList });
  } catch (error) {
    console.error('Error saving list:', error);
    res.json({ success: false, error: 'Error saving list' });
  }
});

app.get('/get-list/:id', async (req, res) => {
  const { id } = req.params;
  const list = await prisma.spellingList.findUnique({
    where: { id: parseInt(id, 10) },
    include: { words: true }
  });

  if (list) res.json(list);
  else res.status(404).json({ error: 'List not found' });
});

app.delete('/delete-list/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.word.deleteMany({
      where: { spellingListId: parseInt(id, 10) }
    });

    await prisma.spellingList.delete({
      where: { id: parseInt(id, 10) }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting list:', error);
    res.json({ success: false, error: 'Error deleting list' });
  }
});

app.post('/save-rewards', async (req, res) => {
  const email = req.session.email;
  if (!email) return res.status(403).json({ success: false, error: 'Unauthorized' });

  const { score100, score6099, score60 } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // Update or create the rewards
    const rewardsData = [
      { scoreRange: '100', reward: score100, userId: user.id },
      { scoreRange: '60-99', reward: score6099, userId: user.id },
      { scoreRange: '<60', reward: score60, userId: user.id }
    ];

    for (const rewardData of rewardsData) {
      await prisma.reward.upsert({
        where: {
          userId_scoreRange: {
            userId: rewardData.userId,
            scoreRange: rewardData.scoreRange
          }
        },
        update: {
          reward: rewardData.reward
        },
        create: rewardData
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving rewards:', error);
    res.json({ success: false, error: 'Error saving rewards' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});