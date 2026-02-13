import axios from 'axios';

const API_URL = 'https://secure-chat-app-backend.onrender.com';

export const register = (data) => axios.post(`${API_URL}/register`, data);
export const login = (data) => axios.post(`${API_URL}/login`, data);
export const getPublicKey = (userId) => axios.get(`${API_URL}/public-key/${userId}`);
