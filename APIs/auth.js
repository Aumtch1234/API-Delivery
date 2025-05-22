// auth.js
const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID_WEB);

async function verifyGoogleToken(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID_WEB,
    });
    return ticket.getPayload();
  } catch (error) {
    console.error('Error verifying Google ID Token:', error);
    return null;
  }
}

// Login route
router.post('/google/login', async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) return res.status(400).json({ error: 'Missing ID Token' });

  const googleUser = await verifyGoogleToken(idToken);

  if (!googleUser) return res.status(401).json({ error: 'Invalid Google ID Token' });

  const { email, name, sub: googleId, picture } = googleUser;

  try {
    // Check user in DB
    const userResult = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
    let user;

    if (userResult.rows.length > 0) {
      user = userResult.rows[0];
    } else {
      // Create new user
      const insertResult = await db.query(
        'INSERT INTO users (google_id, email, display_name, photo_url) VALUES ($1, $2, $3, $4) RETURNING *',
        [googleId, email, name, picture]
      );
      user = insertResult.rows[0];
    }

    // Create JWT token (1 day expiration)
    const token = jwt.sign({ userId: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Send JWT token to client
    res.json({ token });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});


// Middleware to protect routes (optional)
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user; // userId saved here
    next();
  });
}

// Logout route (optional, mostly frontend deletes token)
router.post('/logout', (req, res) => {
  // JWT แบบ stateless ไม่ต้องทำอะไรมาก แค่ frontend ลบ token ก็พอ
  // แต่ถ้าจะมี blacklist token ก็จัดการตรงนี้
  res.json({ message: 'Logout success' });
});

module.exports = { router, authenticateToken };
