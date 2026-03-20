import axios from 'axios';
import { store } from '../app/store'
import { setAccessToken, clearAuth } from '../features/auth/authSlice'

const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const normalizedApiUrl = rawApiUrl?.replace(/\/$/, '');
const API_BASE_URL = normalizedApiUrl
  ? (normalizedApiUrl.endsWith('/api') ? normalizedApiUrl : `${normalizedApiUrl}/api`)
  : 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // sends httpOnly cookie automatically
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Silent refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const res = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true },
        );

        const newToken = res.data.data.access_token;
        store.dispatch(setAccessToken(newToken));

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        store.dispatch(clearAuth());
        // window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default api;