/**
 * Helper: Transform Expense List into Net Balances Map
 * Input: List of Expenses (from DB)
 * Output: { 'userId1': 500, 'userId2': -200, ... }
 */
const calculateNetBalances = (expenses, groupMembers) => {
    const balances = {};

    // 1. Initialize 0 balance for everyone
    groupMembers.forEach(memberId => {
        balances[memberId.toString()] = 0;
    });

    // 2. Process every expense
    expenses.forEach(expense => {
        const { amount, paidBy, splitBetween } = expense;
        const payerId = paidBy.toString();

        // Determine who is involved
        // If splitBetween is empty, it means ALL members are involved
        let involvedIds = [];
        if (splitBetween && splitBetween.length > 0) {
            involvedIds = splitBetween.map(id => id.toString());
        } else {
            involvedIds = groupMembers.map(id => id.toString());
        }

        const splitAmount = amount / involvedIds.length;

        // Payer gets positive balance (Credit)
        if (balances[payerId] !== undefined) {
            balances[payerId] += amount;
        }

        // Consumers get negative balance (Debit)
        involvedIds.forEach(id => {
            if (balances[id] !== undefined) {
                balances[id] -= splitAmount;
            }
        });
    });

    return balances;
};

/**
 * Graph Algorithm to minimize cash flow
 */
const simplifyDebts = (netBalances) => {
    const givers = [];
    const receivers = [];

    // 1. Separate users
    for (const [member, amount] of Object.entries(netBalances)) {
        if (amount < -0.01) givers.push({ member, amount });
        else if (amount > 0.01) receivers.push({ member, amount });
    }

    // 2. Sort (Greedy)
    givers.sort((a, b) => a.amount - b.amount);
    receivers.sort((a, b) => b.amount - a.amount);

    const results = [];
    let giverIdx = 0;
    let receiverIdx = 0;

    // 3. Match
    while (giverIdx < givers.length && receiverIdx < receivers.length) {
        const giver = givers[giverIdx];
        const receiver = receivers[receiverIdx];
        
        const amountToSettle = Math.min(Math.abs(giver.amount), receiver.amount);

        if (amountToSettle > 0.01) {
            results.push({
                from: giver.member,
                to: receiver.member,
                amount: Number(amountToSettle.toFixed(2))
            });
        }

        giver.amount += amountToSettle;
        receiver.amount -= amountToSettle;

        if (Math.abs(giver.amount) < 0.01) giverIdx++;
        if (receiver.amount < 0.01) receiverIdx++;
    }

    return results;
};

module.exports = { calculateNetBalances, simplifyDebts };