require('dotenv').config();
const jwt = require('jsonwebtoken');

// UI 표시용 인증 상태 설정 (보안 검증용 아님)
const addAuthState = (req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            res.locals.isAuthenticated = true;
            res.locals.user = decoded;
        } catch (error) {
            res.locals.isAuthenticated = false;
            res.locals.user = null;
        }
    } else {
        res.locals.isAuthenticated = false;
        res.locals.user = null;
    }
    next();
};

// 실제 보안 검증용 미들웨어 (중요한 액션에 사용)
const requireAuth = (req, res, next) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.status(401).redirect('/login?error=로그인이 필요합니다');
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded; // req.user에 저장 (res.locals와 별도)
        next();
    } catch (error) {
        res.clearCookie('token'); // 유효하지 않은 토큰 제거
        return res.status(401).redirect('/login?error=세션이 만료되었습니다');
    }
};

// 로그인한 사용자는 접근 불가 (로그인/회원가입 페이지용)
const requireGuest = (req, res, next) => {
    const token = req.cookies.token;
    
    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            return res.redirect('/'); // 이미 로그인된 경우 홈으로 리다이렉트
        } catch (error) {
            res.clearCookie('token'); // 유효하지 않은 토큰 제거
        }
    }
    next();
};

module.exports = {
    addAuthState,
    requireAuth,
    requireGuest
};