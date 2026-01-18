import React, { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowRight, ScanLine, Share2, Network } from 'lucide-react';

const InteractiveParticleBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];

        // Mouse state tracking
        const mouse = { x: null, y: null, radius: 150 };

        // Handle window resize to maintain canvas clarity
        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initParticles();
        };

        const handleMouseMove = (event) => {
            mouse.x = event.x;
            mouse.y = event.y;
        };

        const handleMouseLeave = () => {
            mouse.x = null;
            mouse.y = null;
        };

        // Particle Class definition
        class Particle {
            constructor(x, y, directionX, directionY, size, color) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
                this.color = color;
            }

            // Draw individual particle
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = '#6366f1'; // Indigo-500
                ctx.fill();
            }

            // Update particle position and handle boundary collisions
            update() {
                if (this.x > canvas.width || this.x < 0) this.directionX = -this.directionX;
                if (this.y > canvas.height || this.y < 0) this.directionY = -this.directionY;

                // Mouse interaction
                // Movement
                this.x += this.directionX;
                this.y += this.directionY;
                this.draw();
            }
        }

        // Initialize particle array
        const initParticles = () => {
            particles = [];
            const numberOfParticles = (canvas.width * canvas.height) / 9000; // Density calculation
            for (let i = 0; i < numberOfParticles; i++) {
                const size = (Math.random() * 2) + 1;
                const x = (Math.random() * ((canvas.width - size * 2) - (size * 2)) + size * 2);
                const y = (Math.random() * ((canvas.height - size * 2) - (size * 2)) + size * 2);
                const directionX = (Math.random() * 0.4) - 0.2;
                const directionY = (Math.random() * 0.4) - 0.2;
                const color = '#6366f1';

                particles.push(new Particle(x, y, directionX, directionY, size, color));
            }
        };

        // Connect particles with lines if close enough
        const connect = () => {
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    const distance = ((particles[a].x - particles[b].x) * (particles[a].x - particles[b].x))
                        + ((particles[a].y - particles[b].y) * (particles[a].y - particles[b].y));
                    
                    if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                        const opacityValue = 1 - (distance / 20000);
                        ctx.strokeStyle = `rgba(99, 102, 241, ${opacityValue * 0.1})`; // Faint indigo lines
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
                
                // Connect to mouse
                if(mouse.x !== null) {
                    const dx = particles[a].x - mouse.x;
                    const dy = particles[a].y - mouse.y;
                    const distance = Math.sqrt(dx*dx + dy*dy);
                    if (distance < mouse.radius) {
                        ctx.strokeStyle = `rgba(99, 102, 241, ${1 - distance/mouse.radius})`; 
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.stroke();
                    }
                }
            }
        };

        // Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
            }
            connect();
        };

        // Attach listeners and start
        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseout', handleMouseLeave);
        
        handleResize();
        animate();

        // Cleanup on unmount
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseout', handleMouseLeave);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-40 pointer-events-none" />;
};

/**
 * Home Component
 * Landing page featuring a magnetic CTA button and animated tech specs.
 */
const Home = () => {
    const containerRef = useRef();
    const btnRef = useRef();
    
    // Initialize GSAP Context
    const { contextSafe } = useGSAP({ scope: containerRef });

    // --- Magnetic Button Interaction ---
    // Applies a physics-based magnetic pull effect to the primary CTA button
    useEffect(() => {
        const button = btnRef.current;
        if(!button) return;

        const handleMouseMove = (e) => {
            const rect = button.getBoundingClientRect();
            const x = e.clientX - (rect.left + rect.width / 2);
            const y = e.clientY - (rect.top + rect.height / 2);

            // Move button towards cursor with easing
            gsap.to(button, {
                x: x * 0.2, // Strength of the magnetic pull
                y: y * 0.2,
                duration: 0.3,
                ease: "power2.out"
            });
        };

        const handleMouseLeave = () => {
            // Elastic snap-back to original position
            gsap.to(button, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.5)" });
        };

        button.addEventListener('mousemove', handleMouseMove);
        button.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            button.removeEventListener('mousemove', handleMouseMove);
            button.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, []);

    // --- Page Entrance Animations ---
    useGSAP(() => {
        const tl = gsap.timeline();

        // Staggered reveal for Hero Text
        tl.fromTo(".hero-text", 
            { y: 100, opacity: 0, rotateX: -20 },
            { y: 0, opacity: 1, rotateX: 0, duration: 1, stagger: 0.15, ease: "power4.out" }
        );

    }, { scope: containerRef });

    return (
        <div ref={containerRef} className="relative min-h-screen bg-black text-white overflow-hidden font-sans selection:bg-indigo-500/30 flex flex-col items-center justify-center">
            
            {/* Interactive Background Layer */}
            <InteractiveParticleBackground />

            {/* Static Grid Overlay for texture */}
            <div 
                className="absolute inset-0 z-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                    maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)'
                }}
            />

            {/* Main Content Container */}
            <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
    
                {/* Hero Heading with Shimmer Effect */}
                <h1 className="hero-text text-7xl md:text-9xl font-bold mb-6 tracking-tighter leading-none">
                    Smart 
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-text-shimmer bg-[length:200%_auto]"> Split</span>
                </h1>

                {/* Subtitle */}
                <p className="hero-text text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
                    The easiest way to split bills and track shared expenses. 
                    <br className="hidden md:block" />
                    <span className="text-white">Scan receipts</span>, simplify debts, and settle up.
                </p>

                {/* Action Buttons */}
                <div className="hero-text flex flex-col sm:flex-row items-center justify-center gap-6">
                    {/* Primary Magnetic Button */}
                    <div ref={btnRef} className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-200"></div>
                        <Link 
                            to="/login" 
                            className="relative block px-10 py-4 bg-white text-black rounded-xl font-bold text-lg transition-transform active:scale-95"
                        >
                            <span className="flex items-center gap-2">
                                Start Splitting <ArrowRight size={20} />
                            </span>
                        </Link>
                    </div>

                    {/* Secondary Link */}
                    <Link 
                        to="/register" 
                        className="px-8 py-4 text-zinc-400 hover:text-white font-medium text-lg transition-colors border-b border-transparent hover:border-zinc-700"
                    >
                        Create Account
                    </Link>
                </div>

                {/* Tech Specification Footer */}
                <div className="hero-text mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-white/10 pt-8">
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-indigo-400">
                            <ScanLine size={24} />
                        </div>
                        <h3 className="font-bold text-white">Smart OCR</h3>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Tesseract.js Engine</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-purple-400">
                            <Network size={24} />
                        </div>
                        <h3 className="font-bold text-white">Debt Simplification</h3>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Graph Algorithm</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 text-emerald-400">
                            <Share2 size={24} />
                        </div>
                        <h3 className="font-bold text-white">Instant Sync</h3>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">MongoDB Aggregations</p>
                    </div>
                </div>

            </div>

            {/* Styles for CSS Keyframe Animations */}
            <style>{`
                @keyframes shimmer {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }
                .animate-text-shimmer {
                    animation: shimmer 5s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default Home;