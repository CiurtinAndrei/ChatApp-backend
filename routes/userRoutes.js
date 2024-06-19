const express = require('express');
const router = express.Router();
const User = require('../db_models/User');
const Media = require('../db_models/Media');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const sendConfirmationEmail = require('../nodemailer/sender');
const checkAuth = require('../middleware/checkAuth');
const Conversation = require('../db_models/Conversation');

router.post('/register', async (req, res) => {
  const { nume, prenume, username, email, password } = req.body;
  if (!nume || !prenume || !username || !email || !password) {
    return res.status(400).json({ error: "Not all parameters are filled." });
  }
  try {
    const existingUser = await User.findOne({ $or: [{ username: username }, { email: email }] });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email is already taken' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const token = uuidv4();

    const newUser = new User({
      nume,
      prenume,
      username,
      email,
      password: hashedPassword,
      creationToken: token
    });

    await newUser.save();
    await sendConfirmationEmail(email, token);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.post('/login', async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.confirmed) {
      return res.status(403).json({ error: 'Account not confirmed' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const tokenPayload = { email: user.email, username: user.username, id: user._id };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7 days' });

    res.status(200).json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/tokendata', checkAuth, (req, res) => {
  res.json({
    user: req.user
  });
});

router.get('/is-trusted', checkAuth, async (req, res) => {
  try {
    const userData = await User.findById(req.user.id);
    return res.status(200).json({ admin: userData.admin });
  }
  catch (error) {
    console.error('Trusted user error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
})

router.get('/getdata/:id', checkAuth, async (req, res) => {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: "Missing ID" });
  } else {
    const requestedUser = await User.findById(id);
    if (!requestedUser) {
      res.status(404).json({ error: "Could not find specified user." });
    } else {
      res.status(200).json({
        userId: requestedUser._id,
        username: requestedUser.username,
        nume: requestedUser.nume,
        prenume: requestedUser.prenume
      });
    }
  }
})

router.delete('/delete', checkAuth, async (req, res) => {
  try {
    const userToDelete = await User.findById(req.user.id);
    if(userToDelete.picture != null){
      try{
        const mediaToDelete = await Media.findById(userToDelete.picture);
        const pfpInit = path.join(__dirname, '../uploads', 'profilepics', mediaToDelete.uploadedFileName);
        const pfpMoved = path.join(__dirname, '../uploads', 'deleted', mediaToDelete.uploadedFileName);
        await fs.promises.rename(pfpInit, pfpMoved);
        await mediaToDelete.deleteOne();
      }
      catch (error){
        console.error('Error deleting user pfp:', error);
      }
    }
    await userToDelete.deleteOne();
    res.status(200).json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/confirm', async (req, res) => {
  const { token } = req.query;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(token)) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  try {
    const user = await User.findOne({ creationToken: token });
    if (!user) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    if (user.confirmed) {
      return res.status(400).json({ error: 'Account already confirmed' });
    }

    user.confirmed = true;
    await user.save();
    res.status(200).json({ message: 'Email confirmed successfully' });
  } catch (error) {
    console.error('Confirmation error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.post('/confirm-ui', async (req, res) => {
  const { token } = req.body;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidPattern.test(token)) {
    return res.status(400).json({ error: 'Invalid token' });
  }

  try {
    const user = await User.findOne({ creationToken: token });
    if (!user) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    if (user.confirmed) {
      return res.status(400).json({ error: 'Account already confirmed' });
    }

    user.confirmed = true;
    await user.save();
    res.status(200).json({ message: 'Email confirmed successfully' });
  } catch (error) {
    console.error('Confirmation error:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/pfp/:username', async (req, res) => {
  const usernameRequest = req.params.username;
  if (!usernameRequest) {
    return res.status(400).json({ error: "Missing username" });
  }
  try {
    const user = await User.findOne({ username: usernameRequest }).populate({
      path: 'picture',
      select: 'uploadedFileName'
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!user.picture) {
      return res.status(404).json({ error: "User does not have a picture." })
    }
    const fileToSend = path.join(__dirname, "../uploads", "profilepics", user.picture.uploadedFileName);
    res.sendFile(fileToSend);
  } catch (error) {
    console.error('Error retrieving image:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.post('/setpfp', checkAuth, async (req, res) => {
  const { image, fileName } = req.body;

  if (!image || !fileName) {
    return res.status(400).json({ error: 'Image and filename are required' });
  }
  try {
    const userData = await User.findById(req.user.id);
    if(userData.picture != null){
      try{
        const mediaToDelete = await Media.findById(userData.picture);
        const pfpInit = path.join(__dirname, '../uploads', 'profilepics', mediaToDelete.uploadedFileName);
        const pfpMoved = path.join(__dirname, '../uploads', 'deleted', mediaToDelete.uploadedFileName);
        await fs.promises.rename(pfpInit, pfpMoved);
        await mediaToDelete.deleteOne();
      }
      catch (error){
        console.error('Error deleting old user pfp:', error);
      }
    }

    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(fileName);
    const standardFileName = `pfp-${uniqueSuffix}${ext}`;
    const resizedFilePath = path.join(__dirname, '../uploads', 'profilepics', standardFileName);
    const buffer = Buffer.from(image, 'base64');

    await sharp(buffer)
      .resize({ width: 256 })
      .toFile(resizedFilePath);

    const newMedia = new Media({
      uploadedFileName: standardFileName,
      owner: userData._id
    });
    await newMedia.save();
    await userData.updateOne({ picture: newMedia._id });

    res.status(200).json({message:"Profile picture saved."});
  } catch (error) {
    console.error('Error setting profile picture:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/all-groups', checkAuth, async (req, res) => {
  try {
    const groups = await Conversation.find({
      $or: [
        { creator: req.user.id },
        { members: req.user.id }
      ]
    }).select('_id groupName creator').populate({
      path:'creator',
      select:'username'
    });

    res.status(200).json({ groups });
  } catch (error) {
    console.error('Error retrieving groups:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }

});


module.exports = router;
