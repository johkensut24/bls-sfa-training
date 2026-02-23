import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

// Use the full connection string if available (Render uses this),
// otherwise fallback to individual local variables.
const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

pool.on("connect", () => {
  console.log("✅ Database Connection Established");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected Database Error", err);
});

export default pool;
