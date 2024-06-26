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

// Add your Pexels API key in the .env file as PEXELS_API_KEY
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

//Renders home page
app.get('/', (req, res) => {
  res.render('home');
});

//Retrieves spelling lsit for user or creates new user if not found
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

//Renders parent's db with user's spelling lists & rewards
app.get('/parent-dashboard', async (req, res) => {
  const email = req.session.email;
  if (!email) return res.redirect('/');

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      spellingLists: {
        include: { words: true },
        orderBy: { createdAt: 'desc' } // Sort lists by creation date in descending order
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

//Renders child db with current spelling list & rewards
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
      },
      rewards: true
    }
  });

  const lists = user.spellingLists;
  const words = lists.length > 0 ? lists[0].words.map(word => word.word) : [];
  const rewards = user.rewards;

  res.render('cdashboard', {
    email: user.email,
    userId: user.id,
    lists: lists,
    words: words,
    currentIndex: 0,
    rewards: rewards
  });
});

//Saves a new spelling list for user
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

//Submit test results & updates highest score & reward
app.post('/submit-test', async (req, res) => {
  const { listId, correctWordsCount, totalWords } = req.body;

  try {
    const list = await prisma.spellingList.findUnique({ where: { id: listId } });
    if (!list) return res.status(404).json({ error: 'List not found' });

    const score = totalWords > 0 ? Math.round((correctWordsCount / totalWords) * 100) : 0;

    // Find the appropriate reward based on the score
    const rewards = await prisma.reward.findMany({
      where: { userId: list.userId }
    });
    let highestReward = null;

    rewards.forEach(reward => {
      if (score === 100 && reward.scoreRange === '100') {
        highestReward = reward.reward;
      } else if (score >= 60 && score < 100 && reward.scoreRange === '60-99') {
        highestReward = reward.reward;
      } else if (score < 60 && reward.scoreRange === '<60') {
        highestReward = reward.reward;
      }
    });

    // Update highest score if the current score is higher
    if (score > list.highestScore) {
      await prisma.spellingList.update({
        where: { id: listId },
        data: { highestScore: score }
      });
    }

    res.json({ success: true, score, highestScore: Math.max(score, list.highestScore) });
  } catch (error) {
    console.error('Error submitting test:', error);
    res.json({ success: false, error: 'Error submitting test' });
  }
});

// updates highest score & corresponding reward for a spelling list
app.post('/update-high-score', async (req, res) => {
  const { userId, listId, score } = req.body;

  try {
    // Find the current highest score
    const list = await prisma.spellingList.findUnique({
      where: {
        id: listId,
      },
    });

    if (list && score > list.highestScore) {

      // Find the appropriate reward based on the score
      const rewards = await prisma.reward.findMany({
        where: { userId }
      });
      let highestReward = null;

      rewards.forEach(reward => {
        if (score === 100 && reward.scoreRange === '100') {
          highestReward = reward.reward;
        } else if (score >= 60 && score < 100 && reward.scoreRange === '60-99') {
          highestReward = reward.reward;
        } else if (score < 60 && reward.scoreRange === '<60') {
          highestReward = reward.reward;
        }
      });

      // Update the highest score
      await prisma.spellingList.update({
        where: {
          id: listId,
        },
        data: {
          highestScore: score,
          highestReward
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.json({ success: false, error: 'Error updating highest score' });
  }
});

//Retrieves a specific spelling list by ID
app.get('/get-list/:id', async (req, res) => {
  const { id } = req.params;
  const list = await prisma.spellingList.findUnique({
    where: { id: parseInt(id, 10) },
    include: { words: true }
  });

  if (list) res.json(list);
  else res.status(404).json({ error: 'List not found' });
});

//Delete a specific spelling list by ID
app.delete('/delete-list/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.spellingList.delete({
      where: {
        id: Number(id)
      }
    })
    res.status(200).json({ success: true })
  } catch {
    res.status(404).json({ error: 'Delete failed' });
  }
});

//Saves reward settings for user
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

//Retrieves an image for a given word from Pexels API
app.get('/get-image/:word', async (req, res) => {
  const { word } = req.params;
  try {
    const response = await axios.get(`https://api.pexels.com/v1/search?query=${encodeURIComponent(word)}&per_page=1`, {
      headers: {
        Authorization: PEXELS_API_KEY
      }
    });
    const imageUrl = response.data.photos[0]?.src.medium || 'https://via.placeholder.com/300?text=No+Image+Found';
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error fetching image:', error);
    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

//Generates a simple sentence using a given word from OpenAI API
app.get('/get-sentence/:word', async (req, res) => {
  const { word } = req.params;
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4o",
      messages: [{ role: "user", content: `Create a short and simple sentence using the word "${word}" that is easy to understand for children below 10 years old. Make it positive and funny if possible` }],
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
