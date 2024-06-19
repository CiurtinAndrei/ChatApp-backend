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
    // Check if the conversation exists and update settings
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

    if (conversation.creator.toString() === req.user.id || conversation.members.includes(req.user.id)) {
      return res.status(400).json({ error: 'You are already part of the group' });
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

router.get('/all-public', checkAuth, async (req, res) => {
  try {
    const publicGroups = await Conversation.find({ publicGroup: true })
      .select('_id groupName publicGroup members creator')
      .populate({
        path: 'creator',
        select: 'username'
      })
      .lean();

    const filteredGroups = publicGroups.filter(group => {
      const isCreator = group.creator._id.toString() === req.user.id;
      const isMember = group.members.some(memberId => memberId.toString() === req.user.id);
      return !isCreator && !isMember;
    });

    const responseGroups = filteredGroups.map(group => ({
      _id: group._id,
      groupName: group.groupName,
      publicGroup: group.publicGroup,
      creator: group.creator
    }));

    res.status(200).json({ publicGroups: responseGroups });
  } catch (error) {
    console.error('Error fetching public groups:', error);
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
        await Message.deleteMany({ conversationId: conversationToDelete._id });
        await conversationToDelete.deleteOne();
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

/*     if (req.user.id !== conversation.creator || !conversation.members.includes(req.user.id)) {
      return res.status(403).json({ error: 'You may not access data of a conversation you are not a part of.' });
    } */

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

    /* if (req.user.id !== conversation.creator && !conversation.members.includes(req.user.id)) {
      return res.status(403).json({ error: 'Unauthorized access to messages.' });
    } */

    const messages = await Message.find({ conversationId: id }).populate({
      path:'senderId', 
      select: 'username _id'
    });

    if (!messages || messages.length === 0) {
      return res.status(404).json({ error: 'Could not find messages.' });
    }

    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
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

  
});


module.exports = router;