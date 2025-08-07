const express = require('express');
const router = express.Router();
const { stockChat } = require('../controllers/stock-chat');

// POST /api/stock-chat
router.post('/stock-chat', stockChat);

module.exports = router;
