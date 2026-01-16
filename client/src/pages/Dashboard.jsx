import React, { useState, useEffect, useRef } from 'react';
import API from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Users, LogOut, Sparkles, X, ArrowRight } from 'lucide-react'; 
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

/**
 * LiquidNebula Component
 * Renders an animated background with orbiting color blobs using GSAP.
 * Provides a dynamic, fluid visual effect behind the main content.
 */
const LiquidNebula = () => {
    const containerRef = useRef();

    useGSAP(() => {
        // Select all blob elements and apply randomized orbital animation
        const blobs = gsap.utils.toArray('.nebula-blob');
        blobs.forEach((blob) => {
            gsap.to(blob, {
                x: "random(-100, 100, 5)",
                y: "random(-100, 100, 5)",
                scale: "random(0.8, 1.2)",
                rotation: "random(-180, 180)",
                duration: "random(10, 20)",
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });
        });
    }, { scope: containerRef });

    return (
        <div ref={containerRef} className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-black">
            <div className="nebula-blob absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen" />
            <div className="nebula-blob absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] mix-blend-screen" />
            <div className="nebula-blob absolute top-[50%] left-[50%] w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px] mix-blend-screen -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}></div>
        </div>
    );
};

/**
 * Dashboard Component
 * The main landing view for authenticated users.
 * Features:
 * - 3D Tilt effects on cards using GSAP.
 * - Custom magnetic cursor integration.
 * - Group management (List, Create, Navigate).
 */
const Dashboard = () => {
    // State Management
    const [groups, setGroups] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const navigate = useNavigate();
    
    // References
    const containerRef = useRef();
    const cursorRef = useRef();
    
    // Initialize GSAP Context
    const { contextSafe } = useGSAP({ scope: containerRef });

    // --- Animation Handlers ---

    /**
     * Handles mouse movement to drive the custom cursor and 3D card tilt effects.
     * Wrapped in contextSafe for proper GSAP memory management.
     */
    const handleMouseMove = contextSafe((e) => {
        // 1. Animate Cursor Follower
        if (cursorRef.current) {
            gsap.to(cursorRef.current, { 
                x: e.clientX, 
                y: e.clientY, 
                duration: 0.1, 
                ease: "power2.out" 
            });
        }

        // 2. Calculate Spotlight Position and 3D Tilt for Interactive Cards
        const cards = document.querySelectorAll(".interactive-card");
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Update CSS variables for the radial gradient mask
            card.style.setProperty("--mouse-x", `${x}px`);
            card.style.setProperty("--mouse-y", `${y}px`);

            // Calculate tilt rotation based on mouse position relative to card center
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * -3; 
            const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 3;

            gsap.to(card, {
                rotationX: rotateX,
                rotationY: rotateY,
                duration: 0.4,
                ease: "power2.out",
                transformPerspective: 1000,
                transformOrigin: "center"
            });
        });
    });

    /**
     * Resets card transforms when the mouse leaves the interaction area.
     */
    const handleMouseLeave = contextSafe(() => {
        gsap.to(".interactive-card", { 
            rotationX: 0, 
            rotationY: 0, 
            duration: 0.5, 
            ease: "elastic.out(1, 0.5)" 
        });
    });

    // --- Effects ---

    // Bind Event Listeners
    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        
        // Bind mouseleave to individual cards for tilt reset
        const cards = document.querySelectorAll(".interactive-card");
        cards.forEach(el => el.addEventListener("mouseleave", handleMouseLeave));

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            cards.forEach(el => el.removeEventListener("mouseleave", handleMouseLeave));
        };
    }, [groups, handleMouseMove, handleMouseLeave]);

    // Initial Data Fetch
    useEffect(() => { 
        fetchGroups(); 
    }, []);

    // Header Entrance Animation
    useGSAP(() => {
        gsap.to("header", { 
            y: 0, 
            opacity: 1, 
            duration: 1, 
            ease: "power3.out", 
            overwrite: "auto" 
        });
    }, { scope: containerRef }); 

    // Grid Staggered Entry Animation
    useGSAP(() => {
        if (groups.length > 0) {
            gsap.to(".group-card", {
                y: 0, 
                opacity: 1, 
                scale: 1, 
                duration: 0.6, 
                stagger: { each: 0.05, grid: "auto", from: "start" },
                ease: "back.out(1.1)", 
                overwrite: "auto", 
                clearProps: "transform, opacity" 
            });
        }
    }, { scope: containerRef, dependencies: [groups] });

    // --- Modal Animations ---

    const openModal = contextSafe(() => {
        setShowModal(true);
        setTimeout(() => {
            const tl = gsap.timeline();
            // Fade in backdrop
            tl.fromTo(".modal-backdrop", { opacity: 0 }, { opacity: 1, duration: 0.3 });
            // Elastic pop-up for content
            tl.fromTo(".modal-content", 
                { scale: 0.9, opacity: 0, y: 30, rotationX: 10 }, 
                { scale: 1, opacity: 1, y: 0, rotationX: 0, duration: 0.5, ease: "back.out(1.5)" }, "-=0.2"
            );
        }, 10);
    });

    const closeModal = contextSafe(() => {
        const tl = gsap.timeline({ 
            onComplete: () => { 
                setShowModal(false); 
                setNewGroupName(''); 
            } 
        });
        tl.to(".modal-content", { scale: 0.95, opacity: 0, y: 10, duration: 0.2 });
        tl.to(".modal-backdrop", { opacity: 0, duration: 0.2 }, "-=0.1");
    });

    // --- Input Focus Animations ---

    const handleInputFocus = contextSafe((e) => {
        gsap.to(e.target, { 
            borderColor: "#6366f1", 
            boxShadow: "0 0 25px rgba(99, 102, 241, 0.25)", 
            duration: 0.3 
        });
    });

    const handleInputBlur = contextSafe((e) => {
        gsap.to(e.target, { 
            borderColor: "#27272a", 
            boxShadow: "none", 
            duration: 0.3 
        });
    });

    // --- Data & Actions ---

    const fetchGroups = async () => {
        try {
            const res = await API.get('/groups');
            setGroups(res.data);
        } catch (err) {
            if(err.response?.status === 401) { 
                localStorage.removeItem('token'); 
                navigate('/login'); 
            }
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        try { 
            await API.post('/groups', { name: newGroupName }); 
            closeModal(); 
            fetchGroups(); 
        } 
        catch (err) { alert("Failed to create group"); }
    };

    const handleLogout = () => { 
        localStorage.removeItem('token'); 
        navigate('/login'); 
    };

    return (
        <div ref={containerRef} className="min-h-screen bg-black text-zinc-100 p-6 font-sans relative overflow-hidden selection:bg-indigo-500/30">
            
            {/* Background Layer */}
            <LiquidNebula />
            
            {/* Custom Cursor / Torch Effect */}
            <div ref={cursorRef} className="fixed top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2 z-0 mix-blend-screen"></div>

            {/* Header Section */}
            <header className="flex justify-between items-center mb-12 max-w-6xl mx-auto border-b border-zinc-900 pb-6 relative z-10" style={{ opacity: 0, transform: 'translateY(-30px)' }}>
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight mb-1">
                        My Groups
                    </h1>
                    <p className="text-zinc-400 text-sm">Manage your groups</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={openModal} className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95">
                        <Plus size={18} /> New Group
                    </button>
                    <button onClick={handleLogout} className="p-2.5 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-500/50 rounded-full transition-all hover:rotate-90">
                        <LogOut size={18} />
                    </button>
                </div>
            </header>

            {/* Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto relative z-10" style={{ perspective: '1000px' }}>
                {groups.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-32 border border-dashed border-zinc-900 rounded-3xl bg-zinc-900/20 backdrop-blur-sm">
                        <div className="bg-zinc-900 p-5 rounded-full mb-4 animate-bounce">
                            <Sparkles size={32} className="text-zinc-600" />
                        </div>
                        <p className="text-zinc-300 font-medium text-lg">Your space is empty</p>
                        <button onClick={openModal} className="text-indigo-400 text-sm mt-2 hover:underline hover:text-indigo-300 transition-colors">Create your first group</button>
                    </div>
                ) : (
                    groups.map((group) => (
                        <Link 
                            to={`/group/${group._id}`} 
                            key={group._id}
                            style={{ opacity: 0, transform: 'translateY(30px) scale(0.95)' }}
                            className="group-card interactive-card group relative block p-6 bg-zinc-900/40 backdrop-blur-lg rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all duration-100 ease-out"
                        >
                            {/* Card Spotlight Mask */}
                            <div 
                                className="absolute pointer-events-none -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                style={{ background: `radial-gradient(500px circle at var(--mouse-x) var(--mouse-y), rgba(99, 102, 241, 0.15), transparent 40%)` }}
                            />
                            
                            {/* Card Content */}
                            <div className="relative z-10 pointer-events-none">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                                        <Users size={20} className="text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                    <span className="text-[10px] font-bold text-zinc-500 bg-black/50 px-2 py-1 rounded-full border border-white/5 tracking-wider uppercase">
                                        {new Date(group.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-indigo-200 transition-colors tracking-tight">{group.name}</h3>
                                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                    <p className="text-xs text-zinc-400 font-medium flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                                        {group.members.length} Members
                                    </p>
                                    <ArrowRight size={16} className="text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* Create Group Modal */}
            {showModal && (
                <div className="modal-backdrop fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 perspective-1000" style={{ perspective: '1200px' }}>
                    <div className="modal-content bg-[#09090b] p-8 rounded-3xl w-full max-w-md border border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                        <button onClick={closeModal} className="modal-elem absolute top-5 right-5 text-zinc-600 hover:text-white transition-colors bg-zinc-900/50 p-2 rounded-full"><X size={18} /></button>
                        <div className="modal-elem mb-8 text-center">
                            <div className="mx-auto w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800 shadow-xl">
                                <Sparkles className="text-indigo-400 fill-indigo-400/20" size={28} />
                            </div>
                            <h2 className="text-3xl font-bold text-white tracking-tight mb-1">Create Group</h2>
                            <p className="text-zinc-500 text-sm">Start a new space for your group expenses.</p>
                        </div>
                        <form onSubmit={handleCreateGroup}>
                            <div className="modal-elem mb-8">
                                <input 
                                    type="text" 
                                    value={newGroupName} 
                                    onChange={(e) => setNewGroupName(e.target.value)} 
                                    onFocus={handleInputFocus} 
                                    onBlur={handleInputBlur} 
                                    className="w-full p-4 pl-5 rounded-2xl bg-zinc-900/50 border border-zinc-800 text-white focus:outline-none transition-all placeholder-zinc-600 text-lg font-medium" 
                                    placeholder="e.g. Lunch at KFC" 
                                    autoFocus 
                                />
                            </div>
                            <div className="modal-elem flex justify-between gap-4">
                                <button type="button" onClick={closeModal} className="flex-1 py-3.5 text-sm font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition-all">Cancel</button>
                                <button type="submit" className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] hover:-translate-y-0.5 active:translate-y-0">Create Group</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;