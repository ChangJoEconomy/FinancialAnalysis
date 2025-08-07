const asyncHandler = require('express-async-handler');
const User = require("../models/User");
const Preset = require("../models/Preset");
const DefaultPreset = require("../models/DefaultPreset");
const bcrypt = require('bcrypt');

// @desc Get Register Page
// @route GET /register
const getRegisterPage = asyncHandler(async (req, res) => {
    res.render('register', { title: '회원가입' });
});

// @desc Handle Register Form Submission
// @route POST /register
const handleRegister = asyncHandler(async (req, res) => {
    const { user_id, password, password_confirm } = req.body;

    if( !user_id || !password || !password_confirm) {
        return res.status(400).render('register', {
            title: '회원가입',
            error: '모든 필드를 입력해야 합니다.',
            formData: req.body
        });
    }

    if (password !== password_confirm) {
        return res.status(400).render('register', {
            title: '회원가입',
            error: '비밀번호가 일치하지 않습니다.',
            formData: req.body
        });
    }

    if( password.length < 6) {
        return res.status(400).render('register', {
            title: '회원가입',
            error: '비밀번호는 최소 6자 이상이어야 합니다.',
            formData: req.body
        });
    }

    const existingUser = await User.findOne({ user_id });
    if (existingUser) {
        return res.status(400).render('register', {
            title: '회원가입',
            error: '이미 사용 중인 아이디입니다.',
            formData: req.body
        });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
        user_id,
        hashedPassword
    });

    await newUser.save();

    // 기본 프리셋 생성
    const defaultPresets = [
        {
            user_id: user_id,
            preset_name: '일반적 조건',
            description: '일반적인 투자 기준으로 균형잡힌 포트폴리오에 적합합니다.',
            netIncome_warning: -5,
            netIncome_danger: -1,
            netIncome_caution: 0,
            marketCap_warning: 6000,
            marketCap_danger: 4000,
            marketCap_caution: 2000,
            per_warning: 100,
            per_danger: 50,
            per_caution: 20,
            debt_warning: 200,
            debt_danger: 150,
            debt_caution: 100,
            quick_warning: 50,
            quick_danger: 75,
            quick_caution: 100,
            dividend_warning: 1,
            dividend_danger: 2,
            dividend_caution: 4
        },
        {
            user_id: user_id,
            preset_name: '보수적 조건',
            description: '안정성을 중시하는 보수적인 투자 기준입니다.',
            netIncome_warning: -5,
            netIncome_danger: 0,
            netIncome_caution: 3,
            marketCap_warning: 3000,
            marketCap_danger: 2000,
            marketCap_caution: 1000,
            per_warning: 50,
            per_danger: 30,
            per_caution: 20,
            debt_warning: 150,
            debt_danger: 100,
            debt_caution: 70,
            quick_warning: 75,
            quick_danger: 100,
            quick_caution: 120,
            dividend_warning: 1.5,
            dividend_danger: 3,
            dividend_caution: 4.5
        }
    ];

    // 기본 프리셋들을 데이터베이스에 저장
    await Preset.insertMany(defaultPresets);

    // 기본 프리셋 지정
    const defaultPreset = new DefaultPreset({
        user_id: user_id,
        preset_name: '일반적 조건'
    });

    await defaultPreset.save();

    res.redirect('/login');
});

// @ desc change password
// @ route POST /settings/change-password
// 이 함수는 settings.js로 이동되었습니다.

module.exports = {
    getRegisterPage,
    handleRegister
};
