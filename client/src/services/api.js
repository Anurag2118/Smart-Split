import axios from 'axios';

const isDev = import.meta.env.MODE === 'development';

const API = axios.create({
    baseURL: isDev 
        ? 'http://localhost:5000/api'                    // if on local development
        : 'https://fairshare-backend.onrender.com/api',  // if Live
});

// Add a request interceptor to include the token in headers
API.interceptors.request.use((req) => {
    const token = localStorage.getItem('token');
    if (token) {
        req.headers['x-auth-token'] = token;
    }
    return req;
});

export default API;