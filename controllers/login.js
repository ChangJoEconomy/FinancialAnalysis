const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require("../models/User");
const bcrypt = require('bcrypt');

// @desc Get Login Page
// @route GET /login
const getLoginPage = asyncHandler(async (req, res) => {
    const error = req.query.error || null;
    res.render('login', { 
        title: '로그인',
        error: error
    });
});

// @desc Handle Login Form Submission
// @route POST /login
const handleLogin = asyncHandler(async (req, res) => {
    const { user_id, password } = req.body;
    if (!user_id || !password) {
        return res.status(400).render('login', {
            title: '로그인',
            error: '모든 필드를 입력해야 합니다.',
            formData: req.body
        });
    }

    const user = await User.findOne({ user_id });
    if (!user) {
        return res.status(400).render('login', {
            title: '로그인',
            error: '존재하지 않는 아이디입니다.',
            formData: req.body
        });
    }
    const isMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!isMatch) {
        return res.status(400).render('login', {
            title: '로그인',
            error: '비밀번호가 일치하지 않습니다.',
            formData: req.body
        });
    }
    // 로그인 성공
    const token = jwt.sign({ 
        user_id: user.user_id, 
        username: user.username 
    }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '1h' });

    res.cookie('token', token, { httpOnly: true });
    res.redirect('/');
});

module.exports = {
    getLoginPage,
    handleLogin
};
