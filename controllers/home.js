const asyncHandler = require('express-async-handler');

// @desc Get Home Page
// @route GET /
const getHomePage = asyncHandler(async (req, res) => {
    res.render('index', { title: 'Financial Analysis' });
});

module.exports = {
    getHomePage
};
