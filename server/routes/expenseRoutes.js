const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { calculateNetBalances, simplifyDebts } = require('../utils/graphAlgo');

// ROUTE: Create an Expense (POST /api/expenses)
router.post('/', auth, async (req, res) => {
    try {
        // Extract fields from request body. 
        // Support both 'groupId' and 'group' for flexibility.
        const { description, amount, groupId, group, paidBy, splitBetween } = req.body;

        // Determine the valid group identifier
        const finalGroupId = groupId || group;

        // 1. Input Validation: Ensure all required fields are present
        if (!description || !amount || !finalGroupId) {
            return res.status(400).json({ message: "Please enter all fields" });
        }

        // 2. Group Validation: Verify the group exists in the database
        const groupData = await Group.findById(finalGroupId);
        if (!groupData) {
            return res.status(404).json({ message: "Group not found" });
        }

        // 3. Authorization: Verify that the requesting user is a member of the group
        const isMember = groupData.members.some(
            member => member.toString() === req.user.id
        );

        if (!isMember) {
            return res.status(401).json({ message: "Not authorized to add expense to this group" });
        }

        // 4. Create and Save Expense Object
        const newExpense = new Expense({
            description,
            amount,
            group: finalGroupId,
            // Use provided payer ID (manual override) or default to the logged-in user
            paidBy: paidBy || req.user.id,
            // If splitBetween is empty, it implies the expense is split among all members
            splitBetween: splitBetween || []
        });

        const savedExpense = await newExpense.save();

        // 5. Trigger Graph Algorithm (Recalculate Debts)
        
        // Step A: Fetch all expenses associated with this group to calculate the cumulative balance
        const allExpenses = await Expense.find({ group: finalGroupId });

        // Step B: Calculate Net Balances (Who paid what vs. Who consumed what)
        const netBalances = calculateNetBalances(allExpenses, groupData.members);

        // Step C: Execute Min Cash Flow Algorithm to simplify debts (Greedy Approach)
        const simplifiedDebts = simplifyDebts(netBalances);

        // Step D: Update the Group model with the new optimized debt list
        groupData.debts = simplifiedDebts;
        await groupData.save();

        res.status(201).json(savedExpense);

    } catch (err) {
        console.error("Error creating expense:", err.message);
        res.status(500).send("Server Error");
    }
});

// ROUTE: Get Expenses by Group ID (GET /api/expenses/group/:groupId)
router.get('/group/:groupId', auth, async (req, res) => {
    try {
        const { groupId } = req.params;

        // Find all expenses associated with the group ID
        // Populating 'paidBy' to display the payer's name in the UI
        const expenses = await Expense.find({ group: groupId })
            .populate('paidBy', 'name username')
            .sort({ date: -1 }); // Sort by newest first

        if (!expenses) {
            return res.status(404).json({ message: "No expenses found" });
        }

        res.json(expenses);

    } catch (err) {
        console.error("Error fetching expenses:", err.message);
        res.status(500).send("Server Error");
    }
});

// ROUTE: Delete Expense (DELETE /api/expenses/:id)
router.delete('/:id', auth, async (req, res) => {
    try {
        // 1. Find the expense
        const expense = await Expense.findById(req.params.id);
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        const groupId = expense.group;

        // 2. Check authorization (Ensure user belongs to the group)
        // Ideally, check if user is the Creator OR the Payer. For now, allowing any member.
        const group = await Group.findById(groupId);
        if (!group.members.includes(req.user.id)) {
            return res.status(401).json({ message: "Not authorized" });
        }

        // 3. Delete the expense
        await expense.deleteOne();

        // 4. RECALCULATE DEBTS
        const allExpenses = await Expense.find({ group: groupId });
        const netBalances = calculateNetBalances(allExpenses, group.members);
        const simplifiedDebts = simplifyDebts(netBalances);

        group.debts = simplifiedDebts;
        await group.save();

        res.json({ message: "Expense removed" });

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;