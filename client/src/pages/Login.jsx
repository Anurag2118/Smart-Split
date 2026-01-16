import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { User, Lock, ArrowRight } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    
    // References for GSAP animations
    const containerRef = useRef();
    const cardRef = useRef();
    const buttonRef = useRef(); 

    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });

    const { username, password } = formData;
    const { contextSafe } = useGSAP({ scope: containerRef });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --- Animation Logic ---
    useGSAP(() => {
        const tl = gsap.timeline();

        // 1. Background Blobs (Rose & Amber theme)
        tl.from(".blob", {
            scale: 0, opacity: 0, duration: 1.5, ease: "elastic.out(1, 0.5)", stagger: 0.2
        });

        // 2. Card Entrance
        tl.from(cardRef.current, {
            y: 50, opacity: 0, rotateX: 10, duration: 1, ease: "power3.out", clearProps: "transform"
        }, "-=1");

        // 3. Inputs Staggered Entry
        tl.from(".input-field", {
            x: -20, opacity: 0, duration: 0.5, stagger: 0.1, ease: "power2.out"
        }, "-=0.5");

        // 4. Button Entrance (Force Visibility & Pop effect)
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

        // Continuous Floating Animation for Blobs
        gsap.to(".blob-1", { x: "30%", y: "-20%", duration: 6, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.to(".blob-2", { x: "-30%", y: "20%", duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" });

    }, { scope: containerRef });

    // --- 3D Tilt Interaction ---
    const handleMouseMove = contextSafe((e) => {
        if(!cardRef.current) return;
        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;
        
        // Calculate tilt intensity
        const xPos = (clientX / innerWidth - 0.5) * 20;
        const yPos = (clientY / innerHeight - 0.5) * 20;

        gsap.to(cardRef.current, {
            rotationY: xPos, 
            rotationX: -yPos, 
            ease: "power1.out", 
            transformPerspective: 1000, 
            transformOrigin: "center"
        });
    });

    const handleMouseLeave = contextSafe(() => {
        if(!cardRef.current) return;
        // Reset tilt on mouse leave
        gsap.to(cardRef.current, { rotationY: 0, rotationX: 0, ease: "power3.out", duration: 0.5 });
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await API.post('/auth/login', { username, password });
            localStorage.setItem('token', res.data.token);
            navigate('/dashboard');
        } catch (err) {
            // Error Shake Animation
            if(cardRef.current) {
                gsap.timeline()
                    .to(cardRef.current, { x: 10, duration: 0.1 })
                    .to(cardRef.current, { x: -10, duration: 0.1 })
                    .to(cardRef.current, { x: 10, duration: 0.1 })
                    .to(cardRef.current, { x: 0, duration: 0.1 });
            }
            alert(err.response?.data?.message || "Invalid Credentials");
        }
    };

    return (
        <div 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="min-h-screen bg-black flex items-center justify-center p-4 overflow-hidden relative"
        >
            {/* Background Gradient Blobs (Updated to Rose & Amber) */}
            <div className="blob blob-1 absolute top-0 left-0 w-96 h-96 bg-rose-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>
            <div className="blob blob-2 absolute bottom-0 right-0 w-96 h-96 bg-orange-600 rounded-full mix-blend-multiply filter blur-[100px] opacity-40"></div>

            <div 
                ref={cardRef}
                className="bg-zinc-900/40 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/10 relative z-10"
            >
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-300">
                        Welcome Back
                    </h2>
                    <p className="text-zinc-500 text-sm">Enter your credentials to continue</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="input-field">
                        <label className="block text-zinc-400 mb-2 text-sm font-medium">Username</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-rose-400 transition-colors duration-300">
                                <User size={18} />
                            </div>
                            <input 
                                type="text" name="username" value={username} onChange={handleChange} 
                                className="w-full pl-10 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 text-white focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all duration-300 placeholder-zinc-600"
                                placeholder="Enter your username" required 
                            />
                        </div>
                    </div>
                    
                    <div className="input-field">
                        <label className="block text-zinc-400 mb-2 text-sm font-medium">Password</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-rose-400 transition-colors duration-300">
                                <Lock size={18} />
                            </div>
                            <input 
                                type="password" name="password" value={password} onChange={handleChange} 
                                className="w-full pl-10 p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 text-white focus:outline-none focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 transition-all duration-300 placeholder-zinc-600"
                                placeholder="••••••••" required 
                            />
                        </div>
                    </div>

                    <button 
                        ref={buttonRef}
                        type="submit" 
                        className="w-full bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-bold py-3.5 rounded-xl transition-all duration-300 shadow-lg shadow-rose-900/20 hover:shadow-rose-600/30 flex justify-center items-center gap-2 group"
                    >
                        Sign In <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <p className="input-field text-zinc-500 text-center mt-6 text-sm">
                    Don't have an account? <Link to="/register" className="text-rose-400 hover:text-rose-300 transition-colors font-medium">Create one</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;