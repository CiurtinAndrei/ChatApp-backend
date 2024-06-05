const express = require('express');
const router = express.Router();
const Message = require('../db_models/Message');
const checkAuth = require('../middleware/checkAuth');

router.post('/new', checkAuth, async (req, res) => {
    const { conversationId, content, mediaId } = req.body;
    if (!conversationId) {
        return res.status(400).json({ error: "No recipient." });
    }

    try {
        const newMessage = await Message.create({ senderId: req.user.id, conversationId, content, mediaId });

        res.status(201).json({ message: newMessage });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'An internal server error occurred' });
    }
});

router.delete('/delete/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: "Missing ID" });
    }

    try {
        const messageToDelete = await Message.findByIdAndDelete(id);

        if (!messageToDelete) {
            res.status(404).json({ error: 'Message not found.' });
        } else {
            if (messageToDelete._id != req.user.id) {
                res.status(403).json({ error: "You can't delete a message that is not yours." });
            } else {
                res.status(200).json({ message: 'Message deleted successfully' });
            }
        }

    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ error: 'An internal server error occurred' });
    }
});

module.exports = router;