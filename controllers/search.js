const asyncHandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');

// JSON 파일에서 종목 검색하는 함수
const searchStocksFromJSON = (keyword) => {
    try {
        const jsonPath = path.join(__dirname, '../public/data/all_stocks.json');
        
        if (!fs.existsSync(jsonPath)) {
            console.log('all_stocks.json 파일이 존재하지 않습니다.');
            return [];
        }
        
        const stocksData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const lowerKeyword = keyword.toLowerCase();
        
        // 종목명, 코드, 심볼로 검색 (띄어쓰기 무시)
        const normalizedKeyword = lowerKeyword.replace(/\s+/g, '');
        return stocksData.filter(stock => {
            const name = (stock.name || '').toLowerCase().replace(/\s+/g, '');
            const ticker = (stock.ticker || '').toLowerCase().replace(/\s+/g, '');
            const code = (stock.code || '').toLowerCase().replace(/\s+/g, '');
            const symbol = (stock.symbol || '').toLowerCase().replace(/\s+/g, '');
            return name.includes(normalizedKeyword) ||
            ticker.includes(normalizedKeyword) ||
            code.includes(normalizedKeyword) ||
            symbol.includes(normalizedKeyword);
        });
        
    } catch (error) {
        console.error('JSON 검색 중 오류:', error.message);
        return [];
    }
};

// @desc search stocks
// @route GET /search
const getSearchResults = asyncHandler(async (req, res) => {
    const stock = req.query.stock || '';
    console.log(`Searching for: ${stock}`);
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = 10; // 페이지당 10개 항목
    let results = [];
    let totalResults = 0;
    let totalPages = 0;

    // 검색 키워드가 있으면 JSON에서 검색
    if (stock.trim()) {
        const searchResults = searchStocksFromJSON(stock);
        totalResults = searchResults.length;
        totalPages = Math.ceil(totalResults / itemsPerPage);
        
        // 페이지네이션 적용
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedResults = searchResults.slice(startIndex, endIndex);
        
        results = paginatedResults.map(item => {
            let displayName = item.name;
            if (["NASDAQ", "NYSE", "NYSEARCA"].includes(item.market)) {
                const dashIdx = item.name.indexOf(" - ");
                if (dashIdx !== -1) {
                    displayName = item.name.substring(0, dashIdx);
                }
            }
            return {
                name: displayName,
                code: item.ticker || item.code || item.symbol,
                market: item.market
            };
        });
    }
    
    // 검색 결과 페이지 렌더링
    res.render('search', { 
        title: stock ? `${stock} 검색 결과` : '종목 검색',
        stock: stock,
        results: results,
        currentPage: page,
        totalPages: totalPages,
        totalResults: totalResults,
        itemsPerPage: itemsPerPage,
        pageType: 'search'
    });
});

module.exports = {
    getSearchResults
};
