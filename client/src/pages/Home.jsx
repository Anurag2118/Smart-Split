import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white">
      <h1 className="text-5xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
        Smart Split
      </h1>
      <div className="space-x-4">
        <Link to="/login" className="px-6 py-3 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition">
          Login
        </Link>
        <Link to="/register" className="px-6 py-3 border border-indigo-500 rounded-lg hover:bg-indigo-500/10 transition">
          Register
        </Link>
      </div>
    </div>
  );
};

export default Home;