const asyncHandler = require('express-async-handler');
const UserStock = require('../models/UserStock');

// @desc Get My Stocks Page
// @route GET /my-stocks
const getMyStocksPage = asyncHandler(async (req, res) => {
    // 사용자의 내 종목 목록 가져오기
    const myStocks = await UserStock.find({ user_id: req.user.user_id }).sort({ _id: -1 });
    
    res.render('my-stocks', {
        title: '내 종목',
        user: req.user,
        myStocks: myStocks
    });
});

// @desc Add Stock to My Stocks
// @route POST /my-stocks
const addToMyStocks = asyncHandler(async (req, res) => {
    const { stock_code, stock_name, stock_market } = req.body;
    
    if (!stock_code || !stock_name || !stock_market) {
        return res.status(400).json({
            success: false,
            message: '필수 정보가 누락되었습니다.'
        });
    }
    
    // 이미 추가된 종목인지 확인
    const existingStock = await UserStock.findOne({
        user_id: req.user.user_id,
        stock_code: stock_code
    });
    
    if (existingStock) {
        return res.status(400).json({
            success: false,
            message: '이미 내 종목에 추가된 종목입니다.'
        });
    }
    
    // 새 종목 추가
    const newStock = new UserStock({
        user_id: req.user.user_id,
        stock_name: stock_name,
        stock_code: stock_code,
        stock_market: stock_market
    });
    
    await newStock.save();
    
    res.json({
        success: true,
        message: '내 종목에 추가되었습니다.'
    });
});

// @desc Remove Stock from My Stocks
// @route DELETE /my-stocks
const removeFromMyStocks = asyncHandler(async (req, res) => {
    const { stock_code } = req.body;
    
    if (!stock_code) {
        return res.status(400).json({
            success: false,
            message: '종목 코드가 필요합니다.'
        });
    }
    
    const result = await UserStock.findOneAndDelete({
        user_id: req.user.user_id,
        stock_code: stock_code
    });
    
    if (!result) {
        return res.status(404).json({
            success: false,
            message: '내 종목에서 해당 종목을 찾을 수 없습니다.'
        });
    }
    
    res.json({
        success: true,
        message: '내 종목에서 제거되었습니다.'
    });
});

module.exports = {
    getMyStocksPage,
    addToMyStocks,
    removeFromMyStocks
};
