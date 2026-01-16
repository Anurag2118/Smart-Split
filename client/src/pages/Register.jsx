import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { User, Lock, ArrowRight, UserCircle } from 'lucide-react';

const Register = () => {
    const navigate = useNavigate();
    
    // Refs for Animation Targets
    const containerRef = useRef();
    const cardRef = useRef();
    const buttonRef = useRef();

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        password: ''
    });

    const { name, username, password } = formData;
    
    // Setup contextSafe for safe interactions
    const { contextSafe } = useGSAP({ scope: containerRef });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --- ANIMATION LOGIC ---
    useGSAP(() => {
        const tl = gsap.timeline();

        // 1. Background Blobs (Emerald & Teal for Register theme)
        tl.from(".blob", {
            scale: 0, opacity: 0, duration: 1.5, ease: "elastic.out(1, 0.5)", stagger: 0.2
        });

        // 2. Card Entrance
        tl.from(cardRef.current, {
            y: 50, opacity: 0, rotateX: 10, duration: 1, ease: "power3.out", clearProps: "transform"
        }, "-=1");

        // 3. Inputs Stagger (Will handle all 3 fields automatically)
        tl.from(".input-field", {
            x: -20, opacity: 0, duration: 0.5, stagger: 0.1, ease: "power2.out"
        }, "-=0.5");

        // 4. Button Entrance (Force Visibility)
        if (buttonRef.current) {
            tl.fromTo(buttonRef.current, 
                { scale: 0.9, opacity: 0 }, 
                { 
                    scale: 1, 
                    opacity: 1, 
                    duration: 0.4, 
                    ease: "back.out(1.7)",
                    clearProps: "all" 
                }, 
                "-=0.2"
            );
        }

        // Floating Blobs Loop
        gsap.to(".blob-1", { x: "30%", y: "-20%", duration: 6, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.to(".blob-2", { x: "-30%", y: "20%", duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" });

    }, { scope: containerRef });

    // 3D Tilt Logic
    const handleMouseMove = contextSafe((e) => {
        if(!cardRef.current) return;
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        const xPos = (clientX / innerWidth - 0.5) * 20;
        const yPos = (clientY / innerHeight - 0.5) * 20;

        gsap.to(cardRef.current, {
            rotationY: xPos, rotationX: -yPos, ease: "power1.out", transformPerspective: 1000, transformOrigin: "center"
        });
    });

    const handleMouseLeave = contextSafe(() => {
        if(!cardRef.current) return;
        gsap.to(cardRef.current, { rotationY: 0, rotationX: 0, ease: "power3.out", duration: 0.5 });
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await API.post('/auth/register', { name, username, password });
            localStorage.setItem('token', res.data.token);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            // Error Shake Animation
            if(cardRef.current) {
                gsap.timeline()
                    .to(cardRef.current, { x: 10, duration: 0.1 })
                    .to(cardRef.current, { x: -10, duration: 0.1 })
                    .to(cardRef.current, { x: 10, duration: 0.1 })
                    .to(cardRef.current, { x: 0, duration: 0.1 });
            }
            alert(err.response?.data?.message || "Registration Failed");
        }
    };

    return (
        <div 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="min-h-screen bg-slate-950 flex items-center justify-center p-4 overflow-hidden relative"
        >
            {/* Background Blobs */}
            <div className="blob blob-1 absolute top-0 left-0 w-96 h-96 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
            <div className="blob blob-2 absolute bottom-0 right-0 w-96 h-96 bg-teal-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>

            <div 
                ref={cardRef}
                className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/10 relative z-10"
            >
                <h2 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                    Create Account
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* Full Name Field */}
                    <div className="input-field">
                        <label className="block text-gray-400 mb-2 text-sm">Full Name</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                <UserCircle size={18} />
                            </div>
                            <input 
                                type="text" name="name" value={name} onChange={handleChange} 
                                className="w-full pl-10 p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder-gray-500"
                                placeholder="John Doe" required 
                            />
                        </div>
                    </div>

                    {/* Username Field */}
                    <div className="input-field">
                        <label className="block text-gray-400 mb-2 text-sm">Username</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                <User size={18} />
                            </div>
                            <input 
                                type="text" name="username" value={username} onChange={handleChange} 
                                className="w-full pl-10 p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder-gray-500"
                                placeholder="johndoe123" required 
                            />
                        </div>
                    </div>
                    
                    {/* Password Field */}
                    <div className="input-field">
                        <label className="block text-gray-400 mb-2 text-sm">Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                <Lock size={18} />
                            </div>
                            <input 
                                type="password" name="password" value={password} onChange={handleChange} 
                                className="w-full pl-10 p-3 rounded-lg bg-slate-800/50 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder-gray-500"
                                placeholder="••••••••" required 
                            />
                        </div>
                    </div>

                    {/* Button */}
                    <button 
                        ref={buttonRef}
                        type="submit" 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition-colors transition-transform shadow-lg shadow-emerald-500/20 mt-4 flex justify-center items-center gap-2 group"
                    >
                        Register <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <p className="input-field text-gray-500 text-center mt-6 text-sm">
                    Already have an account? <Link to="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;