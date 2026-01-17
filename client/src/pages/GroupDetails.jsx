import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { Receipt, Users, ArrowLeft, Calculator, LogOut, UserPlus, X, Check, ArrowRight, Trash2, ShieldAlert, Wallet, Sparkles } from 'lucide-react';
import AddExpenseModal from '../components/AddExpenseModal';
import SettleUpModal from '../components/SettleUpModal';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

/**
 * GroupDetails Component
 * Displays transaction history, settlement plans, and member management for a specific group.
 * Features high-performance interactive animations using GSAP (custom cursor, spotlight effects, counters).
 */
const GroupDetails = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    
    // Animation Refs
    const containerRef = useRef();
    const cursorRef = useRef();
    const cursorFollowerRef = useRef();

    // State Management
    const [currentUser, setCurrentUser] = useState(null);
    const [group, setGroup] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // UI State
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);
    const [isAddingMember, setIsAddingMember] = useState(false);
    const [newMemberUsername, setNewMemberUsername] = useState('');

    const { contextSafe } = useGSAP({ scope: containerRef });

    // --- Interaction Logic ---
    // Handles custom cursor movement and CSS variable updates for spotlight effects.
    // Wrapped in contextSafe for GSAP compatibility.
    const moveCursor = contextSafe((e) => {
        // Direct transform updates for high performance
        gsap.to(cursorRef.current, { x: e.clientX, y: e.clientY, duration: 0 });
        gsap.to(cursorFollowerRef.current, { x: e.clientX, y: e.clientY, duration: 0.5, ease: "power3.out" });
        
        // Update CSS variables for background grid mask
        if (containerRef.current) {
            containerRef.current.style.setProperty('--mouse-x', `${e.clientX}px`);
            containerRef.current.style.setProperty('--mouse-y', `${e.clientY}px`);
        }

        // Update CSS variables for individual card spotlights
        const cards = document.querySelectorAll(".interactive-card");
        cards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty("--card-x", `${x}px`);
            card.style.setProperty("--card-y", `${y}px`);
        });
    });

    useEffect(() => {
        window.addEventListener("mousemove", moveCursor);
        return () => window.removeEventListener("mousemove", moveCursor);
    }, [loading, group]);

    // --- Authentication ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Decode JWT payload manually to avoid external dependencies
                const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
                const userData = JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
                setCurrentUser(userData.user || userData);
            } catch (e) { console.error(e); }
        }
    }, []);

    // --- Data Fetching ---
    const fetchData = useCallback(async () => {
        try {
            const groupRes = await API.get(`/groups/${groupId}`);
            const expenseRes = await API.get(`/expenses/group/${groupId}`);
            setGroup(groupRes.data);
            setExpenses(expenseRes.data);
            setLoading(false);
        } catch (err) { setLoading(false); }
    }, [groupId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // --- Animations ---
    useGSAP(() => {
        if (!loading && group) {
            // Header Entrance
            gsap.fromTo("header", { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" });
            
            // Settlement Cards Stagger
            if (group.debts.length > 0) {
                gsap.fromTo(".settlement-card", 
                    { y: 20, opacity: 0 }, 
                    { y: 0, opacity: 1, stagger: 0.1, duration: 0.6, ease: "back.out(1.2)" }
                );
            }

            // Expense List Waterfall
            if (expenses.length > 0) {
                gsap.fromTo(".expense-item", 
                    { x: -20, opacity: 0 }, 
                    { x: 0, opacity: 1, stagger: 0.05, duration: 0.5, ease: "power2.out" }
                );
            }
            
            // Sidebar Slide-in
            gsap.fromTo(".member-sidebar", { x: 20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: "power3.out" });

            // Number Counter Animation (0 -> Target Value)
            const counters = document.querySelectorAll(".counter-num");
            counters.forEach(counter => {
                const targetValue = parseInt(counter.getAttribute("data-value") || "0");
                const obj = { val: 0 }; 
                
                gsap.to(obj, {
                    val: targetValue,
                    duration: 1.5,
                    ease: "power2.out",
                    onUpdate: () => {
                        counter.innerText = "₹" + Math.ceil(obj.val);
                    }
                });
            });
        }
    }, { scope: containerRef, dependencies: [loading, group] });

    // --- Helpers ---
    
    // Formats the split description (e.g., "For Alice, Bob" or "For Everyone")
    const getSplitDetails = (split) => {
        if (!split || split.length === 0 || split.length === group.members.length) return "For Everyone";
        const names = group.members.filter(m => split.includes(m._id)).map(m => m.name.split(' ')[0]);
        return `For ${names.join(', ')}`;
    };

    const getCreatorId = (g) => g?.creator?._id || g?.creator;
    const isAdmin = group && currentUser && (String(getCreatorId(group)) === String(currentUser.id || currentUser._id));

    // --- Event Handlers ---

    const handleAddMember = async () => {
        if (!newMemberUsername) return;
        try { 
            await API.put('/groups/addMember', { groupId, username: newMemberUsername }); 
            setNewMemberUsername(''); 
            setIsAddingMember(false); 
            fetchData(); 
        } catch (err) { 
            alert(err.response?.data?.message || "Failed to add member"); 
        }
    };

    // Includes removal animation before deletion API call
    const handleDeleteExpense = contextSafe(async (id) => {
        if (!window.confirm("Are you sure you want to delete this expense?")) return;
        gsap.to(`#expense-${id}`, { 
            height: 0, 
            opacity: 0, 
            duration: 0.3, 
            onComplete: async () => { 
                await API.delete(`/expenses/${id}`); 
                fetchData(); 
            }
        });
    });

    const handleLeaveGroup = async () => { 
        if (window.confirm("Are you sure you want to leave this group?")) { 
            await API.put('/groups/leaveGroup', { groupId }); 
            navigate('/dashboard'); 
        }
    };

    const handleDeleteGroup = async () => { 
        if (window.confirm("WARNING: This will permanently delete the group. Continue?")) { 
            await API.delete(`/groups/${groupId}`); 
            navigate('/dashboard'); 
        }
    };

    if (loading || !group) return <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500">Loading...</div>;

    return (
        <div ref={containerRef} className="min-h-screen bg-black text-zinc-200 p-6 font-sans cursor-none relative overflow-x-hidden selection:bg-indigo-500/30">
            
            {/* Background Visuals: Static grid + Interactive masked spotlight */}
            <div 
                className="fixed inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    opacity: 0.2
                }}
            />
            <div 
                className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-300"
                style={{
                    backgroundImage: `linear-gradient(to right, #52525b 1px, transparent 1px), linear-gradient(to bottom, #52525b 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    maskImage: `radial-gradient(300px circle at var(--mouse-x) var(--mouse-y), black, transparent)`,
                    WebkitMaskImage: `radial-gradient(300px circle at var(--mouse-x) var(--mouse-y), black, transparent)`,
                    opacity: 0.6
                }}
            />

            {/* Custom Cursor Elements */}
            <div ref={cursorRef} className="fixed top-0 left-0 w-2 h-2 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference -translate-x-1/2 -translate-y-1/2 hidden md:block"></div>
            <div ref={cursorFollowerRef} className="fixed top-0 left-0 w-12 h-12 border border-white/20 rounded-full pointer-events-none z-[9998] -translate-x-1/2 -translate-y-1/2 hidden md:block backdrop-blur-[1px]"></div>

            {/* Navigation Bar */}
            <div className="flex justify-between items-center mb-10 max-w-6xl mx-auto relative z-10">
                <button onClick={() => navigate('/dashboard')} className="group flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium tracking-wide">
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> DASHBOARD
                </button>
                <div className="flex gap-4">
                    {isAdmin && (
                        <button onClick={handleDeleteGroup} className="flex items-center gap-2 text-red-500 hover:text-red-400 text-xs font-bold uppercase tracking-wider hover:scale-105 transition-transform">
                            <ShieldAlert size={14} /> Delete
                        </button>
                    )}
                    <button onClick={handleLeaveGroup} className="flex items-center gap-2 text-zinc-1000 hover:text-red-400 text-xs font-bold uppercase tracking-wider hover:scale-105 transition-transform">
                        <LogOut size={14} /> Leave
                    </button>
                </div>
            </div>

            {/* Group Header */}
            <header className="flex flex-col md:flex-row justify-between items-end mb-12 pb-6 border-b border-zinc-900 gap-6 max-w-6xl mx-auto relative z-10">
                <div>
                    <h1 className="text-5xl font-bold text-white tracking-tighter mb-2">{group.name}</h1>
                    <p className="text-zinc-400 text-sm">
                        {group.members.length} Members
                    </p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button onClick={() => setShowSettleModal(true)} className="flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-white text-black rounded-lg text-sm font-bold transition-transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                        <Calculator size={18} /> Settle Up
                    </button>
                    <button onClick={() => setShowExpenseModal(true)} className="flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-lg text-sm font-bold transition-all hover:border-zinc-600 active:scale-95">
                        <Receipt size={18} /> Add Expense
                    </button>
                </div>
            </header>

            {/* Settlement Section */}
            {group.debts.length > 0 && (
                <div className="mb-16 max-w-6xl mx-auto relative z-10">
                    <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Wallet size={16} /> Pending Settlements
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {group.debts.map((debt, index) => {
                            const isPayer = currentUser && debt.from._id === (currentUser.id || currentUser._id);
                            const isReceiver = currentUser && debt.to._id === (currentUser.id || currentUser._id);
                            
                            return (
                                <div 
                                    key={index} 
                                    className="settlement-card interactive-card group relative p-6 rounded-xl bg-zinc-900/40 border border-white/5 overflow-hidden transition-all hover:-translate-y-1"
                                >
                                    <div 
                                        className="absolute pointer-events-none -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{
                                            background: `radial-gradient(600px circle at var(--card-x) var(--card-y), rgba(255,255,255,0.06), transparent 40%)`
                                        }}
                                    />
                                    
                                    <div className="relative z-10 flex flex-col w-full">
                                        <div className="flex items-center justify-between mb-3 text-sm">
                                            <span className={`font-bold ${isPayer ? 'text-rose-400' : 'text-zinc-400'}`}>
                                                {isPayer ? "You" : debt.from.name.split(' ')[0]}
                                            </span>
                                            
                                            <div className="flex items-center gap-1 px-2 text-zinc-600">
                                                <div className="h-px w-3 bg-zinc-700"></div>
                                                <ArrowRight size={12} />
                                                <div className="h-px w-3 bg-zinc-700"></div>
                                            </div>

                                            <span className={`font-bold ${isReceiver ? 'text-emerald-400' : 'text-zinc-400'}`}>
                                                {isReceiver ? "You" : debt.to.name.split(' ')[0]}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div 
                                                className={`text-2xl font-mono font-bold counter-num ${isPayer ? 'text-rose-500' : isReceiver ? 'text-emerald-500' : 'text-white'}`} 
                                                data-value={debt.amount}
                                            >
                                                ₹0
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 max-w-6xl mx-auto relative z-10">
                
                {/* Left Column: Transaction History */}
                <div className="lg:col-span-2">
                    <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Receipt size={16} /> Transaction History
                    </h2>
                    
                    {expenses.length === 0 ? (
                        <div className="py-20 border border-dashed border-zinc-900 rounded-2xl flex flex-col items-center justify-center text-zinc-600">
                            <Sparkles size={40} className="mb-4 opacity-20" />
                            <p>No transactions yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {expenses.map(expense => (
                                <div 
                                    id={`expense-${expense._id}`}
                                    key={expense._id} 
                                    className="expense-item interactive-card group relative p-5 rounded-xl bg-zinc-900/30 border border-white/5 hover:bg-zinc-900/60 transition-all duration-300"
                                >
                                    <div 
                                        className="absolute pointer-events-none -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{
                                            background: `radial-gradient(400px circle at var(--card-x) var(--card-y), rgba(255,255,255,0.04), transparent 40%)`
                                        }}
                                    />

                                    <div className="relative z-10 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-center justify-center w-12 h-12 bg-zinc-950 border border-zinc-900 rounded-lg text-zinc-500 font-mono text-xs">
                                                <span className="font-bold text-zinc-300">{new Date(expense.date).getDate()}</span>
                                                <span>{new Date(expense.date).toLocaleString('default', { month: 'short' }).toUpperCase()}</span>
                                            </div>
                                            
                                            <div>
                                                <h3 className="font-medium text-white text-base group-hover:text-emerald-400 transition-colors">{expense.description}</h3>
                                                <p className="text-xs text-zinc-500 mt-0.5">
                                                    <span className="text-zinc-400">{expense.paidBy.name}</span> paid
                                                </p>
                                                <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-1">
                                                    <Users size={12} /> {getSplitDetails(expense.splitBetween)}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-6">
                                            <span className={`font-mono font-bold text-base ${expense.isSettlement ? 'text-blue-400' : 'text-zinc-200'}`}>
                                                ₹{expense.amount}
                                            </span>
                                            <button 
                                                onClick={() => handleDeleteExpense(expense._id)} 
                                                className="text-zinc-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Member List Sidebar */}
                <div>
                    <div className="member-sidebar sticky top-10 bg-zinc-900/30 border border-white/5 rounded-xl p-5 backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Members</h2>
                            {!isAddingMember && (
                                <button onClick={() => setIsAddingMember(true)} className="text-zinc-400 hover:text-white transition p-2 hover:bg-white/5 rounded-lg">
                                    <UserPlus size={16} />
                                </button>
                            )}
                        </div>

                        {isAddingMember && (
                            <div className="mb-4">
                                <input 
                                    type="text" 
                                    value={newMemberUsername} 
                                    onChange={(e) => setNewMemberUsername(e.target.value)} 
                                    placeholder="Enter username" 
                                    className="w-full bg-black border border-zinc-800 rounded-lg p-2.5 text-sm text-white focus:border-zinc-600 focus:outline-none placeholder-zinc-700 mb-2 transition-colors" 
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setIsAddingMember(false)} className="p-1 text-zinc-600 hover:text-white"><X size={14} /></button>
                                    <button onClick={handleAddMember} className="flex items-center gap-1 text-xs font-bold bg-white text-black px-2 py-1 rounded hover:bg-zinc-200"><Check size={12} /> Add</button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {group.members.map(member => (
                                <div key={member._id} className="member-item flex items-center gap-3 group hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors">
                                    <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center font-bold text-zinc-400 text-xs group-hover:border-zinc-600 group-hover:text-white transition-colors">
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center">
                                            <p className="text-sm font-medium text-zinc-300 truncate group-hover:text-white transition-colors">{member.name}</p>
                                            {String(member._id) === String(getCreatorId(group)) && <span className="text-[10px] text-zinc-1000 border border-zinc-800 px-1.5 rounded uppercase">Admin</span>}
                                        </div>
                                        <p className="text-xs text-zinc-600 truncate">@{member.username}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <AddExpenseModal 
                isOpen={showExpenseModal} 
                onClose={() => setShowExpenseModal(false)} 
                groupId={groupId} 
                members={group.members} 
                refreshData={fetchData} 
            />
            <SettleUpModal 
                isOpen={showSettleModal} 
                onClose={() => setShowSettleModal(false)} 
                group={group} 
                currentUser={currentUser} 
                refreshData={fetchData} 
            />
        </div>
    );
};

export default GroupDetails;
