import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { X, Upload, Type, RefreshCw, Check } from 'lucide-react';
import Tesseract from 'tesseract.js';

/**
 * AddExpenseModal Component
 * Handles adding new expenses with support for manual entry and OCR-based bill scanning.
 * Includes functionality for splitting expenses among specific group members.
 */
const AddExpenseModal = ({ isOpen, onClose, groupId, members, refreshData }) => {
    if (!isOpen) return null;

    // --- State Management ---
    const [activeTab, setActiveTab] = useState('manual'); // Options: 'manual' | 'scan'
    const [loading, setLoading] = useState(false);
    const [ocrProcessing, setOcrProcessing] = useState(false);
    
    // Split Logic State: Default is to split among all members
    const [splitWith, setSplitWith] = useState([]); 
    const [isSplitAll, setIsSplitAll] = useState(true);

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        paidBy: '' 
    });

    /**
     * Effect: Initialize default payer and split participants when members are loaded.
     */
    useEffect(() => {
        if (members && members.length > 0) {
            setFormData(prev => ({ ...prev, paidBy: members[0]._id }));
            // Initialize splitWith array with all member IDs
            setSplitWith(members.map(m => m._id));
            setIsSplitAll(true);
        }
    }, [members, isOpen]);

    // --- Split Management Logic ---

    /**
     * Toggles a member's inclusion in the split.
     * Prevents deselecting the last remaining member.
     * @param {string} memberId - The ID of the member to toggle.
     */
    const toggleMemberSplit = (memberId) => {
        let newSplit;
        if (splitWith.includes(memberId)) {
            // Prevent removing if only one member is selected
            if (splitWith.length === 1) return; 
            newSplit = splitWith.filter(id => id !== memberId);
        } else {
            newSplit = [...splitWith, memberId];
        }
        
        setSplitWith(newSplit);
        // Check if all members are selected to update the 'All' flag
        setIsSplitAll(newSplit.length === members.length);
    };

    /**
     * Resets the split selection to include all members.
     */
    const handleSelectAll = () => {
        setSplitWith(members.map(m => m._id));
        setIsSplitAll(true);
    };

    // --- OCR Logic (Tesseract.js) ---

    /**
     * Handles image upload and executes OCR to extract description and amount.
     * Uses a reverse search strategy for Total Amount to avoid Subtotals.
     * @param {Event} e - File input change event.
     */
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setOcrProcessing(true);
        try {
            // Execute OCR processing
            const { data: { text } } = await Tesseract.recognize(file, 'eng');
            
            const lines = text.split('\n');
            let detectedAmount = '';
            let detectedDesc = 'Scanned Bill';

            // 1. Extract Description: Filter out noise and extract store name
            for (let line of lines) {
                let cleanLine = line.trim();
                
                // Regex filters to ignore special characters and repetitive noise
                if (/^[*\-=_.]+$/.test(cleanLine)) continue;
                if (/(.)\1{2,}/.test(cleanLine)) continue; 
                if (!cleanLine.includes(' ') && cleanLine.length > 10) continue;
                if (cleanLine.length < 4) continue;

                // Use the first valid line as description
                detectedDesc = cleanLine.substring(0, 25);
                break; 
            }

            // 2. Extract Amount: Reverse search for 'Total' to prioritize Grand Total
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].toLowerCase();

                // Look for keywords indicating the final amount
                if (line.includes('total') || line.includes('amount due') || line.includes('payable') || line.includes('grand')) {
                    const matches = lines[i].match(/[\d,]+\.\d{2}/); 
                    if (matches) {
                        // Remove commas for valid number parsing
                        detectedAmount = matches[0].replace(/,/g, '');
                        break; 
                    }
                }
            }
            
            // Fallback: If no keywords found, use the largest logical number found in text
            if (!detectedAmount) {
                const allNumbers = text.match(/\d+(\.\d{1,2})?/g)?.map(num => Number(num.replace(/,/g, ''))) || [];
                const validNumbers = allNumbers.filter(num => num < 2000 || num > 2100); // Filter out years
                
                if (validNumbers.length > 0) detectedAmount = Math.max(...validNumbers);
            }

            // Update form state and switch to manual tab for review
            setFormData(prev => ({
                ...prev,
                description: detectedDesc,
                amount: detectedAmount
            }));

            setActiveTab('manual');

        } catch (err) {
            console.error("[OCR] Processing failed:", err);
            alert("Unable to read the bill accurately. Please enter details manually.");
        } finally {
            setOcrProcessing(false);
        }
    };

    // --- Form Submission ---

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Basic Validation
        if (!formData.description || !formData.amount || !formData.paidBy) {
            alert("Please fill all required fields.");
            setLoading(false);
            return;
        }

        try {
            // Construct Payload
            const payload = {
                description: formData.description,
                amount: Number(formData.amount),
                paidBy: formData.paidBy,
                groupId: groupId,
                splitBetween: splitWith, // Send selected member IDs
                date: new Date()
            };

            await API.post('/expenses', payload);
            
            // Success Handling
            refreshData(); 
            onClose();     
            setFormData({ 
                description: '', 
                amount: '', 
                paidBy: members[0]?._id || '' 
            }); 
            handleSelectAll(); // Reset split selection

        } catch (err) {
            console.error("[Expense] Submission error:", err);
            const errorMessage = err.response?.data?.message || "Failed to add expense.";
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header Section */}
                <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800 shrink-0">
                    <h2 className="text-xl font-bold text-white">Add Expense</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition" aria-label="Close">
                        <X size={24} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-700 shrink-0">
                    <button 
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-4 font-medium flex items-center justify-center gap-2 transition ${activeTab === 'manual' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Type size={18} /> Manual Entry
                    </button>
                    <button 
                        onClick={() => setActiveTab('scan')}
                        className={`flex-1 py-4 font-medium flex items-center justify-center gap-2 transition ${activeTab === 'scan' ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Upload size={18} /> Scan Bill (OCR)
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {activeTab === 'manual' ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* Input Fields */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Description</label>
                                    <input 
                                        type="text" 
                                        value={formData.description} 
                                        onChange={(e) => setFormData({...formData, description: e.target.value})} 
                                        placeholder="e.g. Burger King" 
                                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none" 
                                        required 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Amount (₹)</label>
                                        <input 
                                            type="number" 
                                            value={formData.amount} 
                                            onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                                            placeholder="0.00" 
                                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none" 
                                            required 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Paid By</label>
                                        <select 
                                            value={formData.paidBy} 
                                            onChange={(e) => setFormData({...formData, paidBy: e.target.value})} 
                                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none appearance-none"
                                        >
                                            {members.map(m => (<option key={m._id} value={m._id}>{m.name}</option>))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Split Selection Section */}
                            <div className="pt-2">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm text-gray-400">Split Between</label>
                                    {!isSplitAll && (
                                        <button type="button" onClick={handleSelectAll} className="text-xs text-indigo-400 hover:text-indigo-300">
                                            Select All
                                        </button>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    {members.map(m => {
                                        const isSelected = splitWith.includes(m._id);
                                        return (
                                            <div 
                                                key={m._id}
                                                onClick={() => toggleMemberSplit(m._id)}
                                                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition ${
                                                    isSelected 
                                                    ? 'bg-indigo-600/20 border-indigo-500/50' 
                                                    : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-gray-400'}`}>
                                                        {m.name.charAt(0)}
                                                    </div>
                                                    <span className={`truncate text-sm ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                                                        {m.name}
                                                    </span>
                                                </div>
                                                {isSelected && <Check size={16} className="text-indigo-400" />}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-gray-500 mt-2 text-right">
                                    {isSplitAll ? "Everyone included" : `${splitWith.length} people selected`}
                                </p>
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading} 
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-bold text-white transition disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                            >
                                {loading ? 'Saving...' : 'Add Expense'}
                            </button>
                        </form>
                    ) : (
                        // OCR Upload UI
                        <div className="text-center py-10 space-y-4">
                            {ocrProcessing ? (
                                <div className="flex flex-col items-center animate-pulse">
                                    <RefreshCw className="animate-spin text-indigo-400 mb-4" size={40} />
                                    <h3 className="text-xl font-bold text-white">Processing Image...</h3>
                                    <p className="text-gray-400">Extracting details from the bill.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-indigo-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto text-indigo-400 border-2 border-dashed border-indigo-500/30">
                                        <Upload size={40} />
                                    </div>
                                    <div>
                                        <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg cursor-pointer transition inline-block">
                                            Upload Bill Image
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                        </label>
                                    </div>
                                    <p className="text-gray-400 text-sm">Please upload a clear image for best results.</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AddExpenseModal;