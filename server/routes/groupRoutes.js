const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Group = require('../models/Group');
const User = require('../models/User');
const { simplifyDebts } = require('../utils/graphAlgo');
const Expense = require('../models/Expense');

// ROUTE: Create a Group (POST /api/groups/)
router.post('/', auth, async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Group name is required" });
        }

        // Create new group
        const newGroup = new Group({
            name,
            creator: req.user.id,
            members: [req.user.id]
        });

        const group = await newGroup.save();

        // Add group ID to user's groups array
        await User.findByIdAndUpdate(req.user.id, { 
             $push: { groups: group._id } 
        });

        res.status(201).json(group);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// ROUTE: Add Member to Group (PUT /api/groups/addMember)
router.put('/addMember', auth, async (req, res) => {
    try {
        const { groupId, username } = req.body;

        // 1. Find Group
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        // 2. Check if requester is Admin (Creator)
        if (group.creator.toString() !== req.user.id) {
            return res.status(401).json({ message: "Only admin can add members" });
        }

        // 3. Find User to Add
        const userToAdd = await User.findOne({ username });
        if (!userToAdd) return res.status(404).json({ message: "User not found" });

        // 4. Prevent Duplicates
        if (group.members.includes(userToAdd._id)) {
            return res.status(400).json({ message: "User already in group" });
        }

        // 5. Add User ID to members array
        group.members.push(userToAdd._id);
        
        // 6. Also add Group ID to User's profile (Two-way sync)
        await User.findByIdAndUpdate(userToAdd._id, {
             $push: { groups: group._id } 
        });

        await group.save();
        res.json(group);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// ROUTE: Leave Group (PUT /api/groups/leaveGroup)
router.put('/leaveGroup', auth, async (req, res) => {
    try {
        const { groupId } = req.body;

        // 1. Find the group
        const group = await Group.findById(groupId);
        if (!group) return res.status(404).json({ message: "Group not found" });

        // 2. Filter out the leaving user from the members list
        const remainingMembers = group.members.filter(
            member => member.toString() !== req.user.id
        );

        // 3. ADMIN TRANSFER LOGIC
        // Check if the person leaving is the current Creator
        if (group.creator.toString() === req.user.id) {
            if (remainingMembers.length > 0) {
                // Transfer ownership to the next member in the list (usually the oldest member)
                group.creator = remainingMembers[0]; 
            }
            // If no members are left, the group remains creator-less (or you could delete it)
        }

        // 4. Update the group's member list
        group.members = remainingMembers;
        await group.save();

        // 5. Remove Group ID from the User's profile (Two-way sync)
        await User.findByIdAndUpdate(req.user.id, {
            $pull: { groups: groupId }
        });

        res.json({ message: "Left group successfully" });

    } catch (err) {
        console.error("Leave group error:", err.message);
        res.status(500).send("Server Error");
    }
});

// ROUTE: Get User's Groups (GET /api/groups/)
router.get('/', auth, async (req, res) => {
    try {
        // Find groups where the user is either the Creator OR a Member
        const groups = await Group.find({
            $or: [
                { creator: req.user.id },
                { members: req.user.id }
            ]
        }).sort({ createdAt: -1 }); // Newest first
        
        res.json(groups);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// ROUTE: Get Group Details (GET /api/groups/:groupId)
// Including Members and Simplified Debts
router.get('/:groupId', auth, async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId)
            .populate('members', '-password') // Basic member info
            .populate('debts.from', 'name username') // Populate debtor details
            .populate('debts.to', 'name username');  // Populate creditor details

        if (!group) return res.status(404).json({ message: "Group not found" });
        res.json(group);
    } catch (err) {
        console.error("Error fetching group details:", err.message);
        res.status(500).send("Server Error");
    }
});

// ROUTE: Delete Group (DELETE /api/groups/:groupId)
router.delete('/:groupId', auth, async (req, res) => {
    try {
        const groupId = req.params.groupId;
        const group = await Group.findById(groupId);

        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        // 1. Authorization Check: Ensure requester is the Creator (Admin)
        if (group.creator.toString() !== req.user.id) {
            return res.status(401).json({ message: "Not authorized. Only the admin can delete this group." });
        }

        // 2. Cleanup: Delete all expenses associated with this group
        await Expense.deleteMany({ group: groupId });

        // 3. Cleanup: Remove this group ID from all members' 'groups' array
        await User.updateMany(
            { _id: { $in: group.members } },
            { $pull: { groups: groupId } }
        );

        // 4. Delete the group itself
        await group.deleteOne();

        res.json({ message: "Group and all associated data deleted successfully." });

    } catch (err) {
        console.error("Delete Group Error:", err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
