const mongoose = require('mongoose');

const presetSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
    },
    preset_name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    netIncome_warning: {
        type: Number,
        required: true,
    },
    netIncome_danger: {
        type: Number,
        required: true,
    },
    netIncome_caution: {
        type: Number,
        required: true,
    },
    marketCap_warning: {
        type: Number,
        required: true,
    },
    marketCap_danger: {
        type: Number,
        required: true,
    },
    marketCap_caution: {
        type: Number,
        required: true,
    },
    per_warning: {
        type: Number,
        required: true,
    },
    per_danger: {
        type: Number,
        required: true,
    },
    per_caution: {
        type: Number,
        required: true,
    },
    debt_warning: {
        type: Number,
        required: true,
    },
    debt_danger: {
        type: Number,
        required: true,
    },
    debt_caution: {
        type: Number,
        required: true,
    },
    quick_warning: {
        type: Number,
        required: true,
    },
    quick_danger: {
        type: Number,
        required: true,
    },
    quick_caution: {
        type: Number,
        required: true,
    },
    dividend_warning: {
        type: Number,
        required: true,
    },
    dividend_danger: {
        type: Number,
        required: true,
    },
    dividend_caution: {
        type: Number,
        required: true,
    },
});

presetSchema.index({ user_id: 1, preset_name: 1 }, { unique: true }); // 유저와 프리셋명이 PK
module.exports = mongoose.model('Preset', presetSchema);