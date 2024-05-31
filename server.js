const express = require("express");
const { connectMongooseDb } = require('./mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const imageRoutes = require('./routes/imageRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const friendRoutes = require('./routes/friendRoutes');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors({
  origin: `*`,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['sessionId', 'Content-Type', 'Authorization'],
  exposedHeaders: ['sessionId'],
}));
app.options('*', cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/user', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/images', imageRoutes);
app.use('/friends', friendRoutes);

const PORT = process.env.APP_PORT;

async function startServer() {
  if (!fs.existsSync("./uploads")) {
    console.log(`[SERVER] Creating uploads folder`);
    fs.mkdirSync("uploads");
  }

  if (!fs.existsSync("./uploads/rescaled")) {
    console.log(`[SERVER] Creating uploads/rescaled folder`);
    fs.mkdirSync("uploads/rescaled");
  }

  if (!fs.existsSync("./uploads/profilepics")) {
    console.log(`[SERVER] Creating uploads/profilepics folder`);
    fs.mkdirSync("uploads/profilepics");
  }
  if (!fs.existsSync("./uploads/deleted")) {
    console.log(`[SERVER] Creating uploads/deleted folder`);
    fs.mkdirSync("uploads/deleted");
  } else {
    const deletedPath = path.join(__dirname, "./uploads", "deleted");
    try {
      const files = fs.readdirSync(deletedPath);

      if (files.length === 0) {
        console.log(`[SERVER] The directory ${deletedPath} is already empty.`);
      } else {
        for (const file of files) {
          const filePath = path.join(deletedPath, file);
          fs.unlinkSync(filePath);
        }
  
        console.log(`[SERVER] All files of folder ${deletedPath} deleted successfully.`);
      }

    } catch (error) {
      console.error(`[SERVER] Error clearing directory ${deletedPath} :`, error);
    }
  }
  
  try {
    await connectMongooseDb();

    app.listen(PORT, () => {
      console.log(`[SERVER] Started successfully on port: ${PORT}`);
    });
  } catch (error) {
    console.error(`[SERVER] Error starting:`, error);
  }
}

startServer();