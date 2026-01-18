import axios from 'axios';

// Detect Current Environment
const isDevelopment = import.meta.env.MODE === 'development';

/**
 * Axios Instance Configuration
 * - baseURL: Dynamic based on environment
 */
const API = axios.create({
    baseURL: isDevelopment 
        ? 'http://localhost:5000/api'                    // Local Backend
        : 'https://smart-split-backend.onrender.com/api' // Production Backend (Render)
});

/**
 * Request Interceptor
 * Automatically attaches the JWT token from localStorage to every outgoing request.
 * This ensures protected routes on the backend can authenticate the user.
 */
API.interceptors.request.use((req) => {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            req.headers['x-auth-token'] = token; // Standard custom header for JWT
        }
        return req;
    } catch (error) {
        console.error("[API] Error attaching token:", error);
        return Promise.reject(error);
    }
});

export default API;