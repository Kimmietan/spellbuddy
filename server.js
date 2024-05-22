const express = require('express');
const session = require('express-session');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
const { OpenAIApi, Configuration } = require('openai');

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
});
const openai = new OpenAIApi(configuration);

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
        include: { words: true },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  const lists = user.spellingLists;
  const words = lists.length > 0 ? lists[0].words.map(word => word.word) : [];

  res.render('cdashboard', { lists, words, currentIndex: 0 });
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

app.post('/save-rewards', async (req, res) => {
  const email = req.session.email;
  if (!email) return res.status(403).json({ success: false, error: 'Unauthorized' });

  const { score100, score6099, score60 } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    const rewardsData = [
      { scoreRange: '100', reward: score100, userId: user.id },
      { scoreRange: '60-99', reward: score6099, userId: user.id },
      { scoreRange: '<60', reward: score60, userId: user.id }
    ];

    for (const rewardData of rewardsData) {
      await prisma.reward.upsert({
        where: {
          userId_scoreRange: {
            userId: user.id,
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

app.get('/get-image/:word', async (req, res) => {
  const { word } = req.params;
  const imageUrl = `https://via.placeholder.com/300?text=${word}`;
  res.json({ imageUrl });
});

app.get('/get-sentence/:word', async (req, res) => {
  const { word } = req.params;
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4o",
      messages: [{ role: "user", content: `Create a short and simple sentence using the word "${word}" that is easy to understand for children below 10 years old.` }],
      max_tokens: 20,
    });

    const sentence = response.data.choices[0].message.content.trim();
    res.json({ sentence });
  } catch (error) {
    console.error('Error fetching sentence:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to fetch sentence' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
