const express = require('express');
const router = express.Router();
const { getHomePage } = require('../controllers/home');
const { getSearchResults } = require('../controllers/search');
const { getLoginPage, handleLogin } = require('../controllers/login');
const { getRegisterPage, handleRegister } = require('../controllers/register');
const { addAuthState, requireAuth, requireGuest } = require('../middleware/auth');
const { getStockDetailsPage } = require('../controllers/stock-details');
const { getSettingsPage, savePreset, getPreset, deletePreset, setDefaultPreset, changePassword } = require('../controllers/settings');
const { getMyStocksPage, addToMyStocks, removeFromMyStocks } = require('../controllers/my-stocks');

// 모든 라우트에 UI용 인증 상태 미들웨어 적용
router.use(addAuthState);

router.route('/')
    .get(getHomePage);

router.route('/search')
    .get(getSearchResults);

router.route('/stock-details')
    .get(requireAuth,getStockDetailsPage);

// 게스트만 접근 가능한 라우트 (로그인된 사용자는 홈으로 리다이렉트)
router.route('/login')
    .get(requireGuest, getLoginPage)
    .post(requireGuest, handleLogin);

router.route('/register')
    .get(requireGuest, getRegisterPage)
    .post(requireGuest, handleRegister);

// 내 종목 관련 라우트들
router.route('/my-stocks')
    .get(requireAuth, getMyStocksPage)
    .post(requireAuth, addToMyStocks)
    .delete(requireAuth, removeFromMyStocks);

router.route('/settings')
    .get(requireAuth, getSettingsPage);

router.route('/settings/change-password')
    .post(requireAuth, changePassword);

// 프리셋 관련 라우트들
router.route('/settings/preset')
    .post(requireAuth, savePreset);

router.route('/settings/default-preset')
    .post(requireAuth, setDefaultPreset);

router.route('/settings/preset/:name')
    .get(requireAuth, getPreset)
    .delete(requireAuth, deletePreset);

router.route('/logout')
    .get((req, res) => {
        res.clearCookie('token');
        res.redirect('/');
    });

module.exports = router;