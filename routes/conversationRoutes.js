const express = require('express');
const router = express.Router();
const Message = require('../db_models/Message');
const Conversation = require('../db_models/Conversation');
const checkAuth = require('../middleware/checkAuth');

router.post('/new', checkAuth, async (req, res) => {
  const { members } = req.body;
  if (!members) {
    return res.status(400).json({ error: "Missing members." });
  }

  try {
    const newConversation = await Conversation.create({ creator: req.user.id, members });

    res.status(201).json({ convId: newConversation._id });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.delete('/delete/:id', checkAuth, async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }
  try {
    const conversationToDelete = await Conversation.findById(id);
    if (!conversationToDelete) {
      res.status(404).json({ error: 'Conversation not found.' });
    } else {
      if (conversationToDelete.creator == req.user.id) {
        conversationToDelete.deleteOne();
        res.status(200).json({ message: 'Conversation deleted successfully' });
      } else {
        res.status(403).json({ error: "You are not the owner of this group chat, so you can't delete it." })
      }
    }
  } catch (error) {
    console.error('Error deleting Conversation:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.get('/mdata/:id', checkAuth, async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }

  try {
    const conversation = await Conversation.findById(id).populate({
      path: 'creator',
      select: 'username _id'
    })
      .populate({
        path: 'members',
        select: 'username _id'
      });;

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (req.user.id !== conversation.creator && !conversation.members.includes(req.user.id)) {
      return res.status(403).json({ error: 'You may not access data of a conversation you are not a part of.' });
    }

    res.status(200).json(conversation);

  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});


router.get('/messages/:id', checkAuth, async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }

  try {
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    if (req.user.id !== conversation.creator && !conversation.members.includes(req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized access to messages.' });
    }

    const messages = await Message.find({ conversationId: id });

    if (!messages || messages.length === 0) {
      return res.status(404).json({ error: 'Could not find messages.' });
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});


module.exports = router;