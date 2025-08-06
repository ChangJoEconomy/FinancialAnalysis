const mongoose = require('mongoose');

const userStock = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
    },
    stock_name: {
        type: String,
        required: true,
    },
    stock_code: {
        type: String,
        required: true,
    },
    stock_market: {
        type: String,
        required: true,
    },
});

module.exports = mongoose.model('UserStock', userStock);