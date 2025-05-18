const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { router: authRoutes } = require('./auth');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// API routes
app.use('/api/auth', authRoutes);

app.listen(port, () => {
  console.log(`✅ Server is running on port http://localhost:${port} 💯`);
});
