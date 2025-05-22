// register.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db'); // <-- สมมุติว่าเชื่อมต่อ PostgreSQL
const router = express.Router();
require('dotenv').config();

router.post('/register', async (req, res) => {
  const { name, photo_url, email, password, birthdate, gender, phone } = req.body;

  if (!name || !photo_url || !email || !password || !birthdate || !gender || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const existingUser = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO users (email, password, display_name, photo_url, birthdate, gender, phone, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [email, hashedPassword, name, photo_url, birthdate, gender, phone, false]
    );

    const newUser = result.rows[0];
    const token = jwt.sign({ userId: newUser.user_id }, process.env.JWT_SECRET, {
      expiresIn: '1d',
    });

    res.status(201).json({ token, message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = { router };

