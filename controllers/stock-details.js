const asyncHandler = require('express-async-handler');
const yahooFinance = require('yahoo-finance2').default;
const UserStock = require('../models/UserStock');

// 신호등 색상 결정 함수
const getSignalColor = (value, type = 'default') => {
    if (type === 'netIncome' || type === 'roe' || type === 'dividendYield') {
        if (value >= 15) return 'green';
        if (value >= 5) return 'orange';
        return 'red';
    }
    if (type === 'per') {
        if (value <= 10) return 'green';
        if (value <= 20) return 'orange';
        return 'red';
    }
    if (type === 'marketCap') {
        if (value >= 10) return 'green';
        if (value >= 1) return 'orange';
        return 'red';
    }
    if (type === 'capitalIncrease') {
        return value ? 'red' : 'green';
    }
    // 기본값
    if (value > 0) return 'green';
    if (value === 0) return 'orange';
    return 'red';
};

// @desc Get Stock Details Page
// @route GET /stock-details
const getStockDetailsPage = asyncHandler(async (req, res) => {
    const { market, code, name } = req.query;
    if (!market || !code || !name) {
        return res.status(400).render('error', {
            title: '오류',
            message: '잘못된 요청입니다. 다시 시도해주세요.'
        });
    }

    try {
        // 야후 파이낸스 심볼 변환
        let symbol = code;
        if (market === 'KOSPI') {
            symbol = `${code}.KS`;
        }
        else if (market === 'KOSDAQ') {
            symbol = `${code}.KQ`;
        }

        // Promise.all을 사용하여 실제 필요한 데이터만 가져오기 (현재가, 차트 데이터)
        const [quote, historical] = await Promise.all([
            yahooFinance.quote(symbol),
            yahooFinance.historical(symbol, {
                period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                period2: new Date(),
                interval: '1d'
            })
        ]);

        // 기본 데이터 추출 (실제 데이터)
        const currentPrice = quote.regularMarketPrice;
        const changeAmount = quote.regularMarketChange;
        const changeRate = quote.regularMarketChangePercent;
        const companyName = name;
        
        // 차트 데이터 변환 (실제 데이터)
        const chartData = historical.map(item => ({
            date: item.date.toISOString().split('T')[0],
            price: item.close
        }));
        
        // 더미 재무 데이터 생성
        const dummyFinancials = {
            netIncome: 250,  // 250억원
            netIncomeGrowth: 8.5,  // 8.5% 성장
            marketCap: 45,  // 45조원
            marketCapRank: 1,  // 1위
            trailingPE: 12.5,  // 후행 PER
            futurePER: 11.2,   // 선행 PER
            industryAvgPER: 14.8, // 업계 평균
            roe: 15.8,  // ROE 15.8%
            dividendYield: 2.8,  // 배당수익률 2.8%
            dividend: 1500,  // 배당금 1500원
            hasRecentCapitalIncrease: false,
            capitalIncreaseDate: null,
            paidInCapital: 0,
            totalAssets: 3500,  // 3500억원
            totalLiabilities: 1200,  // 1200억원
            totalEquity: 2300   // 2300억원
        };
        
        // 더미 뉴스 데이터
        const dummyNews = [
            {
                title: `${companyName} 3분기 실적 호조`,
                summary: '3분기 영업이익이 전년 동기 대비 15% 증가하며 시장 기대치를 상회했습니다.',
                date: new Date().toISOString().split('T')[0]
            },
            {
                title: `${companyName} 신규 투자 계획 발표`,
                summary: '반도체 부문 확장을 위한 대규모 투자 계획을 발표했습니다.',
                date: new Date(Date.now() - 86400000).toISOString().split('T')[0]
            },
            {
                title: `${companyName} 배당금 인상 결정`,
                summary: '주주 환원 정책 강화의 일환으로 배당금을 전년 대비 5% 인상하기로 결정했습니다.',
                date: new Date(Date.now() - 172800000).toISOString().split('T')[0]
            }
        ];
        // --------------------------------------------------------------------------------------------------------

        const stock = {
            name: companyName,
            code: code,
            market: market,
            currentPrice: currentPrice,
            changeAmount: changeAmount,
            changeRate: changeRate,
            description: '대한민국의 대표적인 글로벌 기업으로 반도체, 스마트폰, 디스플레이 등 다양한 분야에서 세계 최고 수준의 기술력을 보유하고 있습니다.',
            chartData: chartData,
            financials: dummyFinancials,
            news: dummyNews
        };

        // 신호등 색상을 템플릿에서 사용할 수 있도록 res.locals에 추가
        res.locals.getSignalColor = (value, metric) => {
            switch (metric) {
                case 'netIncome':
                    return getSignalColor(stock.financials.netIncomeGrowth, 'netIncome'); // 성장률 기준으로 변경
                case 'marketCap':
                    return getSignalColor(value, 'marketCap');
                case 'trailingPE': // trailingPE 기준으로 변경
                    return getSignalColor(value, 'per');
                case 'roe':
                    return getSignalColor(value, 'roe');
                case 'dividendYield':
                    return getSignalColor(value, 'dividendYield');
                case 'paidInCapital':
                    return getSignalColor(stock.financials.hasRecentCapitalIncrease, 'capitalIncrease');
                default:
                    return getSignalColor(value);
            }
        };

        // 내 종목 여부 확인
        let isFavorite = false;
        if (req.user) {
            isFavorite = await UserStock.exists({
                user_id: req.user.user_id,
                stock_code: code
            });
        }

        res.render('stock-details', {
            title: `${stock.name} 정보`,
            stock: stock,
            user: req.user,
            isFavorite
        });

    } catch (error) {
        console.error('Yahoo Finance API Error:', error);
        // API가 404를 반환하는 경우 (종목 없음)
        if (error.result && error.result.error && error.result.error.code === 'Not Found') {
             return res.status(404).render('error', {
                title: '오류',
                message: `종목 코드 '${code}'에 대한 정보를 찾을 수 없습니다. 코드를 확인해주세요.`
            });
        }
        return res.status(500).render('error', {
            title: '오류',
            message: '서버에서 주식 정보를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        });
    }
});

module.exports = {
    getStockDetailsPage
};