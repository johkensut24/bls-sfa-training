import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "none",
  secure: true,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

const PASSWORD_MIN_LENGTH = 8;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 50;

// Valid training types
const VALID_TRAINING_TYPES = [
  "Basic Life Support Training",
  "Basic Life Support and Standard First Aid Training",
  "Basic Life Support Training of trainers",
  "Standard First Aid Training of trainers",
];

// Valid participant types
const VALID_PARTICIPANT_TYPES = ["Lay Rescuer", "Healthcare Provider"];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate JWT token
 * @param {number} id - User ID
 * @returns {string} JWT token
 */
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {Object} Validation result
 */
const validateUsername = (username) => {
  if (!username || typeof username !== "string") {
    return { valid: false, message: "Username is required" };
  }

  const trimmed = username.trim();

  if (trimmed.length < USERNAME_MIN_LENGTH) {
    return {
      valid: false,
      message: `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      message: `Username must be less than ${USERNAME_MAX_LENGTH} characters`,
    };
  }

  // Only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
    return {
      valid: false,
      message: "Username can only contain letters, numbers, and underscores",
    };
  }

  return { valid: true, value: trimmed };
};

/**
 * Validate password format
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
const validatePassword = (password) => {
  if (!password || typeof password !== "string") {
    return { valid: false, message: "Password is required" };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
    };
  }

  // Check for at least one uppercase, one lowercase, and one number
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }

  return { valid: true };
};

/**
 * Validate certificate data
 * @param {Object} data - Certificate data
 * @returns {Object} Validation result
 */
const validateCertificateData = (data) => {
  const errors = [];

  // Required fields
  if (!data.participant_name || !data.participant_name.trim()) {
    errors.push("participant_name is required");
  }

  // Validate training type if provided
  if (
    data.training_type &&
    !VALID_TRAINING_TYPES.includes(data.training_type)
  ) {
    errors.push(
      `training_type must be one of: ${VALID_TRAINING_TYPES.join(", ")}`,
    );
  }

  // Validate participant type if provided
  if (
    data.participant_type &&
    !VALID_PARTICIPANT_TYPES.includes(data.participant_type)
  ) {
    errors.push(
      `participant_type must be one of: ${VALID_PARTICIPANT_TYPES.join(", ")}`,
    );
  }

  // Validate age if provided
  if (data.age !== undefined && data.age !== null && data.age !== "") {
    const ageNum = parseInt(data.age);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      errors.push("age must be a valid number between 0 and 120");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize certificate data for database insertion
 * @param {Object} data - Raw certificate data
 * @returns {Object} Sanitized data
 */
const sanitizeCertificateData = (data) => {
  return {
    participant_name: data.participant_name?.trim() || null,
    training_type: data.training_type?.trim() || null,
    training_date: data.training_date?.trim() || null,
    venue: data.venue?.trim() || null,
    facility: data.facility?.trim() || null,
    participant_type: data.participant_type?.trim() || null,
    age: data.age ? parseInt(data.age) : null,
    position: data.position?.trim() || null,
  };
};

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({ message: usernameValidation.message });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ message: passwordValidation.message });
    }

    // Check if user already exists
    const userExists = await pool.query(
      "SELECT id FROM users WHERE username = $1",
      [usernameValidation.value],
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, created_at",
      [usernameValidation.value, hashedPassword],
    );

    // Generate token
    const token = generateToken(newUser.rows[0].id);

    // Set cookie
    res.cookie("token", token, COOKIE_OPTIONS);

    // Return user data (without password)
    return res.status(201).json({
      user: {
        id: newUser.rows[0].id,
        username: newUser.rows[0].username,
        created_at: newUser.rows[0].created_at,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res
      .status(500)
      .json({ message: "Server error during registration" });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate inputs
    if (!username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find user
    const user = await pool.query(
      "SELECT id, username, password, created_at FROM users WHERE username = $1",
      [username.trim()],
    );

    if (user.rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const userData = user.rows[0];

    // Compare password
    const isMatch = await bcrypt.compare(password, userData.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(userData.id);

    // Set cookie
    res.cookie("token", token, COOKIE_OPTIONS);

    // Return user data (without password)
    return res.json({
      user: {
        id: userData.id,
        username: userData.username,
        created_at: userData.created_at,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error during login" });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (protected route)
 */
router.get("/me", protect, async (req, res) => {
  try {
    // req.user is set by protect middleware
    return res.json(req.user);
  } catch (err) {
    console.error("Get user error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/auth/logout
 * Logout user by clearing token cookie
 */
router.post("/logout", (req, res) => {
  try {
    // clearCookie is more readable and handles the expiration for you
    res.clearCookie("token", {
      ...COOKIE_OPTIONS,
      // Ensure we remove maxAge/expires from the options spread
      // so clearCookie can set its own 'expired' timestamp
    });

    return res.status(200).json({ message: "Identity De-authorized" });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({ message: "Server error during logout" });
  }
});

// ============================================================================
// CERTIFICATE ROUTES
// ============================================================================

/**
 * GET /api/auth/certificates
 * Get all certificates
 */
router.get("/certificates", async (req, res) => {
  try {
    const allCerts = await pool.query(
      "SELECT * FROM certificates ORDER BY id DESC",
    );
    return res.json(allCerts.rows);
  } catch (err) {
    console.error("Get certificates error:", err);
    return res.status(500).json({ message: "Failed to fetch certificates" });
  }
});

/**
 * GET /api/auth/certificates/date/:date
 * Get certificates by date
 */
router.get("/certificates/date/:date", async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date parameter
    if (!date || date.trim() === "") {
      return res.status(400).json({ message: "Date parameter is required" });
    }

    const results = await pool.query(
      `SELECT * FROM certificates 
       WHERE training_date LIKE $1 
          OR created_at::date = $2 
       ORDER BY id ASC`,
      [`%${date.trim()}%`, date.trim()],
    );

    return res.json(results.rows);
  } catch (err) {
    console.error("Get certificates by date error:", err);
    return res
      .status(500)
      .json({ message: "Failed to fetch certificates by date" });
  }
});

/**
 * POST /api/auth/certificates
 * Create a new certificate
 */
router.post("/certificates", async (req, res) => {
  try {
    // Validate certificate data
    const validation = validateCertificateData(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    // Sanitize data
    const sanitized = sanitizeCertificateData(req.body);

    // Insert into database
    const newCert = await pool.query(
      `INSERT INTO certificates (
        participant_name, 
        training_type, 
        training_date, 
        venue, 
        facility, 
        participant_type, 
        age, 
        position
      ) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        sanitized.participant_name,
        sanitized.training_type,
        sanitized.training_date,
        sanitized.venue,
        sanitized.facility,
        sanitized.participant_type,
        sanitized.age,
        sanitized.position,
      ],
    );

    return res.status(201).json(newCert.rows[0]);
  } catch (err) {
    console.error("Create certificate error:", err);
    return res.status(500).json({ message: "Failed to create certificate" });
  }
});

/**
 * PUT /api/auth/certificates/:id
 * Update an existing certificate
 */
router.put("/certificates/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    const certId = parseInt(id);
    if (isNaN(certId)) {
      return res.status(400).json({ message: "Invalid certificate ID" });
    }

    // Check if certificate exists
    const existing = await pool.query(
      "SELECT id FROM certificates WHERE id = $1",
      [certId],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    // Validate certificate data
    const validation = validateCertificateData(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        message: "Validation failed",
        errors: validation.errors,
      });
    }

    // Sanitize data
    const sanitized = sanitizeCertificateData(req.body);

    // Update certificate
    const updated = await pool.query(
      `UPDATE certificates SET 
        participant_name = $1, 
        training_type = $2, 
        training_date = $3, 
        venue = $4, 
        facility = $5, 
        participant_type = $6, 
        age = $7, 
        position = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *`,
      [
        sanitized.participant_name,
        sanitized.training_type,
        sanitized.training_date,
        sanitized.venue,
        sanitized.facility,
        sanitized.participant_type,
        sanitized.age,
        sanitized.position,
        certId,
      ],
    );

    return res.json(updated.rows[0]);
  } catch (err) {
    console.error("Update certificate error:", err);
    // This sends the SPECIFIC error (like "column age does not exist") to the console
    return res.status(500).json({ message: err.message });
  }
});

/**
 * DELETE /api/auth/certificates/:id
 * Delete a certificate (consider adding this for completeness)
 */
router.delete("/certificates/:id", protect, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    const certId = parseInt(id);
    if (isNaN(certId)) {
      return res.status(400).json({ message: "Invalid certificate ID" });
    }

    // Check if certificate exists
    const existing = await pool.query(
      "SELECT id FROM certificates WHERE id = $1",
      [certId],
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Certificate not found" });
    }

    // Delete certificate
    await pool.query("DELETE FROM certificates WHERE id = $1", [certId]);

    return res.json({ message: "Certificate deleted successfully" });
  } catch (err) {
    console.error("Delete certificate error:", err);
    return res.status(500).json({ message: "Failed to delete certificate" });
  }
});

// ============================================================================
// SYSTEM SETTINGS ROUTES
// ============================================================================

/**
 * GET /api/auth/settings
 * Get system settings (signatories)
 */
router.get("/settings", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'off%'",
    );

    // Transform array into object
    const settingsObj = rows.reduce((acc, row) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});

    return res.json(settingsObj);
  } catch (err) {
    console.error("Get settings error:", err);
    return res.status(500).json({ message: "Failed to fetch system settings" });
  }
});

/**
 * POST /api/auth/settings
 * Update system settings (protected - requires authentication)
 */
router.post("/settings", protect, async (req, res) => {
  try {
    const settings = req.body;

    // Validate settings object
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ message: "Invalid settings data" });
    }

    const keys = Object.keys(settings);

    if (keys.length === 0) {
      return res.status(400).json({ message: "No settings provided" });
    }

    // Validate that all keys are valid setting keys
    const validKeys = [
      "off1_name",
      "off1_pos",
      "off1_sig",
      "off2_name",
      "off2_pos",
      "off3_name",
      "off3_pos",
    ];

    const invalidKeys = keys.filter((key) => !validKeys.includes(key));
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        message: `Invalid setting keys: ${invalidKeys.join(", ")}`,
      });
    }

    // Use transaction for atomicity
    await pool.query("BEGIN");

    try {
      for (const key of keys) {
        const value = settings[key];

        // Update or insert setting
        await pool.query(
          `INSERT INTO system_settings (setting_key, setting_value, updated_at)
           VALUES ($1, $2, CURRENT_TIMESTAMP)
           ON CONFLICT (setting_key) 
           DO UPDATE SET 
             setting_value = EXCLUDED.setting_value,
             updated_at = CURRENT_TIMESTAMP`,
          [key, value || ""],
        );
      }

      await pool.query("COMMIT");

      return res.json({ message: "System settings updated successfully" });
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }
  } catch (err) {
    console.error("Update settings error:", err);
    return res
      .status(500)
      .json({ message: "Failed to update system settings" });
  }
});

export default router;
