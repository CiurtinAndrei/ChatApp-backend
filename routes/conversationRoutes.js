const express = require('express');
const router = express.Router();
const Message = require('../db_models/Message');
const Conversation = require('../db_models/Conversation');
const checkAuth = require('../middleware/checkAuth');

router.post('/new', checkAuth, async (req, res) => {
  const { name, public, members } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Group must have a name." });
  }

  try {
    const newConversation = await Conversation.create({ groupName: name, publicGroup: public, creator: req.user.id, members });

    res.status(201).json({ convId: newConversation._id });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
  //create a new group
});

router.put('/update/:id', checkAuth, async (req, res) => {
  const { id } = req.params;
  const { name, public, members } = req.body;

  try {
    // Check if the conversation exists
    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    } else {
      if (conversation.creator != req.user.id) {
        return res.status(403).json({ error: "You must be the creator of the group to update its details!" });
      }
    }

    if (name) {
      conversation.groupName = name;
    }
    if (public !== undefined) {
      conversation.publicGroup = public;
    }
    if (members) {
      conversation.members = members;
    }

    await conversation.save();

    res.status(200).json({ message: 'Conversation updated successfully' });
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});

router.post('/join/:id', checkAuth, async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(404).json({ error: "Missing ID." });
  }

  try {
    const conversation = await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    if (!conversation.publicGroup) {
      return res.status(403).json({ error: 'You cannot join a private group' });
    }

    conversation.members.push(req.user.id);

    await conversation.save();

    res.status(200).json({ message: 'Joined group successfully' });
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
});


router.get('/all-public', async (req, res) => {
  try {
    const publicGroups = await Conversation.find({ publicGroup: true })
      .select('_id groupName publicGroup')
      .populate({
        path: 'creator',
        select: 'username'
      }).lean();

    res.status(201).json({ publicGroups });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }

  //get all public groups in the app - id, name
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
        await Message.deleteMany({ conversationId: conversationToDelete._id });
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
  //delete a group by its id, only the owner can delete it, on deletion it also deletes all messages!
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
  //gets the metadata of the group (name, creator, members, createdAt, type)
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
  // gets all messages for a group where the logged in user is either creator or member
});

router.post('/leave/:id', checkAuth, async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Missing ID" });
  }

  try {

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    if (!conversation.members.includes(req.user.id)) {
      return res.status(403).json({ error: 'Cannot leave a group you are not a part of.' });
    }

    conversation.members = conversation.members.filter(member => member != req.user.id);

    await conversation.save();

    res.status(200).json({ message: 'Left group successfully' });

  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }

  //leave a group based on its id
});


module.exports = router;