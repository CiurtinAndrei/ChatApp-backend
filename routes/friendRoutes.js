const express = require('express');
const router = express.Router();
const User = require('../db_models/User');
const Friend = require('../db_models/Friend');
const checkAuth = require('../middleware/checkAuth');

router.post("/add", checkAuth, async (req, res) => {
    const { person2 } = req.body;
    if(!person2){
        return res.status(400).json({error:"Missing person to add."});
    }
    try {
        const p2 = await User.findOne({ username: person2 }).lean();
        if (!p2) {
            res.status(404).json({ error: "Could not find the person to add." });
        } else {
            if (req.user.id == p2._id) {
                return res.status(400).json({ message: "Cannot add yourself as a friend." });
            } else {
                const existingFriendship = await Friend.findOne({
                    $or: [
                        { person1: req.user.id, person2: p2._id },
                        { person1: p2._id, person2: req.user.id }
                    ]
                }).lean();
                if (existingFriendship) {
                    res.status(400).json({ message: "Already friends." });
                } else {
                    const newFriendship = new Friend({
                        person1: req.user.id,
                        person2: p2._id
                    });
                    await newFriendship.save();
                    res.status(201).json({ message: "Added friend." });
                }
            }

        }
    }
    catch (error) {
        console.error('Error adding friend:', error);
        res.status(500).json({ error: 'An internal server error occurred' });
    }
});

router.get("/get", checkAuth, async (req, res) => {
    try {
        const friends = await Friend.find({
            $or: [
                { person1: req.user.id },
                { person2: req.user.id }
            ]
        })
            .populate({
                path: 'person1',
                select: 'username'
            })
            .populate({
                path: 'person2',
                select: 'username'
            })
            .lean();
        if (!friends) {
            res.status(404).json({ error: "User does not have friends :( " });
        } else {
            const friendsData = friends.map(friend => friend.person2);
            res.status(200).json(friendsData);
        }
    }
    catch (error) {
        console.error('Error finding friends:', error);
        res.status(500).json({ error: 'An internal server error occurred' });
    }
});

router.delete("/delete/:id", checkAuth, async (req, res) => {
    const { id } = req.params;
    if(!id){
        return res.status(400).json({error:"Missing ID"});
    }
    try {
        
        const deletedFriendship = await Friend.findOneAndDelete({
            $or: [
                { person1: req.user.id, person2: id },
                { person1: id, person2: req.user.id }
            ]
        });

        if (!deletedFriendship) {
            return res.status(404).json({ error: "Friendship not found" });
        }

        res.status(200).json({ message: "Friendship deleted successfully" });
    } catch (error) {
        console.error("Error deleting friendship:", error);
        res.status(500).json({ error: "An internal server error occurred" });
    }
});

module.exports = router;
