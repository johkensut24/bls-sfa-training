import axios from "axios";

// 1. Ensure the /api/auth prefix is included in the base
const base = import.meta.env.VITE_API_URL || "http://localhost:5000";
export const API_URL = `${base}/api/auth`;

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Required for JWT cookies to work
});

// 2. Enhanced Interceptor for better debugging
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // This will now tell you the EXACT status (404, 500, etc.) and the URL it tried to hit
    console.error("Detailed API Error:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      attemptedUrl: error.config?.url,
    });
    return Promise.reject(error);
  },
);

export default api;
