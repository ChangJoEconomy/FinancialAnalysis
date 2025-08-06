const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    hashedPassword: {
        type: String,
        required: true,
        minlength: 6,
        trim: true
    },
});

module.exports = mongoose.model('User', userSchema);
