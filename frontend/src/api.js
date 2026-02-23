import axios from "axios";

// Fallback to localhost if the environment variable is missing
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Optional: Add an interceptor to help you debug errors in the console
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data?.message || error.message);
    return Promise.reject(error);
  },
);

export default api;
