import axios from "axios";

// Add the /api/auth prefix here so your components don't have to repeat it
export const API_URL =
  (import.meta.env.VITE_API_URL || "http://localhost:5000") + "/api/auth";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // This will now show you EXACTLY why it failed in the browser console
    console.error("API Error Details:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url,
    });
    return Promise.reject(error);
  },
);

export default api;
