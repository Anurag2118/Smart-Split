import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { X, Check, ArrowRight, User } from 'lucide-react';

/**
 * SettleUpModal Component
 * * This component handles the settlement of debts between group members.
 * It supports two modes of operation:
 * 1. PAY Mode: The logged-in user pays a debt they owe to another member.
 * 2. RECEIVE Mode: The logged-in user records a payment received from another member who owes them.
 * * The transaction is recorded as an 'Expense' in the backend, which the Graph Algorithm 
 * then processes to zero out the existing debt.
 */
const SettleUpModal = ({ isOpen, onClose, group, currentUser, refreshData }) => {
    // Return early if the modal is not open or group data is missing to prevent render errors.
    if (!isOpen || !group) return null;

    // --- State Management ---
    const [loading, setLoading] = useState(false);
    const [targetUserId, setTargetUserId] = useState(''); // The other person involved in the transaction
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState('PAY'); // Options: 'PAY' (You pay them) | 'RECEIVE' (They pay you)

    // --- User Identification ---
    // Safely extract the current user's ID, handling potential differences in token structure (id vs _id).
    const currentUserId = currentUser?.id || currentUser?._id;

    // --- Debt Filtering Logic ---
    // Filter the group's debt list to find only those relevant to the current user.
    // Case A: d.from === currentUserId -> You owe money (Payer).
    // Case B: d.to === currentUserId   -> Someone owes you money (Receiver).
    const relevantDebts = group.debts?.filter(d => 
        (d.from && d.from._id === currentUserId) || 
        (d.to && d.to._id === currentUserId)
    ) || [];

    // --- Auto-Selection Effect ---
    // Automatically selects the first available debt when the modal opens.
    // Sets the mode (PAY/RECEIVE) based on the relationship in that debt.
    useEffect(() => {
        if (relevantDebts.length > 0 && !targetUserId) {
            const firstDebt = relevantDebts[0];
            
            if (firstDebt.from._id === currentUserId) {
                // Scenario: You owe them. Default to PAY mode.
                setTargetUserId(firstDebt.to._id);
                setMode('PAY');
            } else {
                // Scenario: They owe you. Default to RECEIVE mode.
                setTargetUserId(firstDebt.from._id);
                setMode('RECEIVE');
            }
            setAmount(firstDebt.amount);
        }
    }, [relevantDebts, isOpen, targetUserId, currentUserId]);

    // --- Handlers ---

    /**
     * Handles changes in the user selection dropdown.
     * Updates the amount and mode based on the specific debt relationship with the selected user.
     */
    const handleUserChange = (e) => {
        const selectedId = e.target.value;
        setTargetUserId(selectedId);
        
        // Find the specific debt record involving the selected user
        const debt = relevantDebts.find(d => 
            d.from._id === selectedId || d.to._id === selectedId
        );

        if (debt) {
            setAmount(debt.amount);
            
            // Update Mode Logic:
            // If the debt originates from ME, I need to PAY.
            // If the debt originates from THEM, I need to RECEIVE.
            if (debt.from._id === currentUserId) {
                setMode('PAY');
            } else {
                setMode('RECEIVE');
            }
        }
    };

    /**
     * Submits the settlement transaction to the API.
     * Constructs a payload that mimics an expense to neutralize the debt.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!targetUserId || !amount) {
            alert("Please select a person and enter amount.");
            setLoading(false);
            return;
        }

        // Find the target user's details for the description
        const targetUser = group.members.find(m => m._id === targetUserId);
        const targetName = targetUser ? targetUser.name : 'User';

        try {
            let payload = {};

            if (mode === 'PAY') {
                // Mode: You are paying THEM.
                // Logic: Money leaves YOUR pocket (paidBy: You) and goes to THEM (splitBetween: Them).
                payload = {
                    description: `Settlement to ${targetName}`,
                    amount: Number(amount),
                    groupId: group._id,
                    paidBy: currentUserId,
                    splitBetween: [targetUserId],
                    isSettlement: true
                };
            } else {
                // Mode: They are paying YOU.
                // Logic: Money leaves THEIR pocket (paidBy: Them) and goes to YOU (splitBetween: You).
                payload = {
                    description: `Settlement from ${targetName}`,
                    amount: Number(amount),
                    groupId: group._id,
                    paidBy: targetUserId,
                    splitBetween: [currentUserId],
                    isSettlement: true
                };
            }

            // API Call
            await API.post('/expenses', payload);
            
            // Post-submission cleanup
            refreshData(); // Triggers re-calculation of debts on the dashboard
            onClose();
            setTargetUserId('');
            setAmount('');
        } catch (err) {
            console.error("Settlement Error:", err);
            alert(err.response?.data?.message || "Failed to settle up.");
        } finally {
            setLoading(false);
        }
    };

    // --- Render ---

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
                
                {/* Modal Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-emerald-900/20">
                    <h2 className="text-xl font-bold text-emerald-400">Settle Up</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition" aria-label="Close Modal">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    
                    {/* Error State: User identification failed */}
                    {!currentUserId ? (
                        <div className="text-center py-4 text-red-400">
                             <p>Error: Could not identify logged-in user.</p>
                             <p className="text-xs mt-1">Please logout and login again to refresh your session.</p>
                        </div>
                    ) : relevantDebts.length === 0 ? (
                        // Empty State: No debts found
                        <div className="text-center py-4 text-gray-400">
                            <Check className="mx-auto text-emerald-500 mb-2" size={48} />
                            <p>You are all settled up! No active debts found.</p>
                        </div>
                    ) : (
                        <>
                            {/* Visual Transaction Flow Animation */}
                            <div className="flex items-center justify-between px-4">
                                
                                {/* Payer Icon (Left Side) */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold border-2 ${mode === 'PAY' ? 'bg-slate-700 border-slate-600' : 'bg-emerald-600 border-emerald-500'}`}>
                                        {/* If mode is PAY, 'You' are the payer. If RECEIVE, the 'User' icon represents the other person. */}
                                        {mode === 'PAY' ? 'You' : <User size={24} />}
                                    </div>
                                    <span className="text-xs text-gray-400">{mode === 'PAY' ? 'Payer (You)' : 'Payer'}</span>
                                </div>

                                {/* Directional Arrow & Status Text */}
                                <div className="flex flex-col items-center">
                                    <span className="text-xs font-bold text-emerald-400 mb-1">
                                        {mode === 'PAY' ? 'PAYING' : 'RECEIVING'}
                                    </span>
                                    <ArrowRight className="text-emerald-500 animate-pulse" size={24} />
                                </div>

                                {/* Receiver Icon (Right Side) */}
                                <div className="flex flex-col items-center gap-2">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold border-2 ${mode === 'PAY' ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-700 border-slate-600'}`}>
                                        {/* If mode is PAY, 'User' icon is receiver. If RECEIVE, 'You' are the receiver. */}
                                        {mode === 'PAY' ? <User size={24} /> : 'You'}
                                    </div>
                                    <span className="text-xs text-gray-400">{mode === 'PAY' ? 'Receiver' : 'Receiver (You)'}</span>
                                </div>
                            </div>

                            {/* Input Fields */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Settle with</label>
                                    <select 
                                        value={targetUserId} 
                                        onChange={handleUserChange}
                                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none appearance-none"
                                    >
                                        {relevantDebts.map(debt => {
                                            // Determine context for label (Paying vs Receiving)
                                            const isYouOwe = debt.from._id === currentUserId;
                                            const person = isYouOwe ? debt.to : debt.from;
                                            const label = isYouOwe 
                                                ? `${person.name} (You owe ₹${debt.amount})` 
                                                : `${person.name} (Owes you ₹${debt.amount})`;
                                            
                                            return (
                                                <option key={person._id} value={person._id}>
                                                    {label}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Amount (₹)</label>
                                    <input 
                                        type="number" 
                                        value={amount} 
                                        onChange={(e) => setAmount(e.target.value)} 
                                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-xl focus:border-emerald-500 focus:outline-none"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Submit Button (Context Aware Color) */}
                            <button 
                                type="submit" 
                                disabled={loading} 
                                className={`w-full py-4 rounded-lg font-bold text-white transition disabled:opacity-50 shadow-lg ${
                                    mode === 'PAY' 
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                                }`}
                            >
                                {loading ? 'Processing...' : mode === 'PAY' ? 'Pay Now' : 'Record Payment'}
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};

export default SettleUpModal;