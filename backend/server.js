import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";

dotenv.config();

const app = express();

// UPDATED CORS CONFIGURATION
app.use(
  cors({
<<<<<<< HEAD
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Keep the 10mb limit because Base64 image strings are very large
=======
    origin: "https://frontend-ufk5.onrender.com", // Your exact frontend URL
    credentials: true,                           // This fixes the 'include' error
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"]
  })
);

>>>>>>> 450ad58f3b2d178b6c72a0f19e2d892fa0e2b445
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());

// Simple health check to verify backend is up on Render
app.get("/", (req, res) => res.send("Server is alive"));

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
