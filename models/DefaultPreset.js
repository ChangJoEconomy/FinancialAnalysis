const mongoose = require('mongoose');

const defaultPresetSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        unique: true
    },
    preset_name: {
        type: String,
        required: true
    },
});

module.exports = mongoose.model('DefaultPreset', defaultPresetSchema);
