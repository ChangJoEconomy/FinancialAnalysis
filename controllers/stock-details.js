const asyncHandler = require('express-async-handler');
const yahooFinance = require('yahoo-finance2').default;
const UserStock = require('../models/UserStock');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const DART_API_KEY = process.env.DART_API_KEY;

const stocks = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/all_stocks.json'), 'utf-8'));

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

// json에서 기본 정보 가져오는 함수
function getStockInfoByTicker(ticker) {
    return stocks.find(stock => stock.ticker === ticker);
}

// 최근 당기순이익과 성장률을 가져오는 함수
async function getRecentNetIncomeGrowth(corpCode) {
    // DART_API_KEY가 전역 변수로 설정되어 있다고 가정합니다.
    if (!DART_API_KEY) {
        console.error('DART_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.');
        return null;
    }

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear - 2];
    const results = {};

    const getIncomeDataForYear = async (year) => {
        // 우선 표준 계정 ID를 사용하는 신규 API로 시도합니다.
        const standardApiUrl = 'https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json';
        const standardApiParams = {
            crtfc_key: DART_API_KEY,
            corp_code: corpCode,
            bsns_year: String(year),
            reprt_code: '11011', // 연간 사업보고서
            fs_div: 'CFS'
        };

        try {
            const res = await axios.get(standardApiUrl, { params: standardApiParams });
            const { data } = res;

            // API 응답 상태를 먼저 확인합니다.
            if (data.status !== '000') {
                console.warn(`${year}년 데이터 조회 실패 (표준 API): ${data.message}`);
                return null;
            }
            
            // 데이터가 존재하면 'ifrs-full_ProfitLoss' (당기순이익) 계정을 찾습니다.
            if (data.list && data.list.length > 0) {
                const incomeData = data.list.find(item => item.account_id === 'ifrs-full_ProfitLoss');
                if (incomeData) {
                    return Number(incomeData.thstrm_amount);
                }
            }
        } catch (err) {
            console.error(`${year}년 표준 API 조회 중 오류 발생:`, err.message);
        }

        // 표준 API 실패 시, 백업 API로 시도합니다.
        console.log(`${year}년 표준 API에서 데이터가 없어 백업 API를 시도합니다.`);
        const backupApiUrl = 'https://opendart.fss.or.kr/api/fnlttSinglAcnt.json';
        const backupApiParams = {
            crtfc_key: DART_API_KEY,
            corp_code: corpCode,
            bsns_year: String(year),
            reprt_code: '11011',
            fs_div: 'CFS'
        };

        try {
            const res = await axios.get(backupApiUrl, { params: backupApiParams });
            const { data } = res;

            if (data.status !== '000') {
                console.warn(`${year}년 데이터 조회 실패 (백업 API): ${data.message}`);
                return null;
            }

            if (data.list && Array.isArray(data.list) && data.list.length > 0) {
                // 손익계산서(IS) 데이터만 필터링
                const incomeStatement = data.list.filter(item => item.sj_div === 'IS');

                // '당기순이익' 또는 '당기순손익'을 포함하는 계정을 찾습니다.
                const netIncome = incomeStatement.find(row =>
                    row.account_nm.includes('당기순이익') || row.account_nm.includes('당기순손익')
                );

                if (netIncome) {
                    // 쉼표 제거 후 숫자 변환
                    return Number(netIncome.thstrm_amount.replace(/,/g, ''));
                }
            }
        } catch (err) {
            console.error(`${year}년 백업 API 조회 중 오류 발생:`, err.message);
        }

        console.warn(`${year}년 당기순이익 데이터를 찾을 수 없습니다.`);
        return null;
    };

    // 최신 연도와 이전 연도 데이터 비동기적으로 가져오기
    results.recentNetIncome = await getIncomeDataForYear(years[0]);
    results.prevNetIncome = await getIncomeDataForYear(years[1]);

    let growthRate = null;
    if (results.recentNetIncome !== null && results.prevNetIncome !== null) {
        // 분모가 0이 아니거나, 양수에서 음수로, 음수에서 양수로 전환되는 경우를 고려한 성장률 계산
        if (results.prevNetIncome !== 0) {
            growthRate = ((results.recentNetIncome - results.prevNetIncome) / Math.abs(results.prevNetIncome)) * 100;
        } else {
            // 전년도 당기순이익이 0인 경우 (성장률 계산 불가능)
            growthRate = Infinity; // 또는 null 처리
        }
    }

    return {
        recentYear: years[0],
        recentNetIncome: results.recentNetIncome,
        prevYear: years[1],
        prevNetIncome: results.prevNetIncome,
        growthRate: growthRate === Infinity ? 'N/A (분모 0)' : (growthRate ? growthRate.toFixed(2) : null)
    };
}

// @desc Get Stock Details Page
// @route GET /stock-details
const getStockDetailsPage = asyncHandler(async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).render('error', {
            title: '오류',
            message: '잘못된 요청입니다. 다시 시도해주세요.'
        });
    }

    try {
        // 우선 json에서 기본 정보를 가져옴
        const basic_info = getStockInfoByTicker(code); // 삼성전자 ticker 예시
        if (basic_info) {
            companyName = basic_info.name;
            corp_code = basic_info.corp_code;
            market = basic_info.market;
        }
        else {
            return res.status(400).render('error', {
                title: '오류',
                message: '주식 정보를 찾을 수 없습니다. 잠시후 다시 시도해주세요.'
            });
        }
        console.log("회사 코드:", corp_code);

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

        // 금일 가격정보 가져오기
        const currentPrice = quote.regularMarketPrice;
        const changeAmount = quote.regularMarketChange;
        const changeRate = quote.regularMarketChangePercent;
        const marketCap = quote.marketCap;
        
        // 차트 데이터 변환
        const chartData = historical.map(item => ({
            date: item.date.toISOString().split('T')[0],
            price: item.close
        }));

        // 당기 순이익 성장률 계산
        let netIncomeGrowth = null;
        const incomeData = await getRecentNetIncomeGrowth(corp_code);
        
        // 더미 재무 데이터 생성
        const dummyFinancials = {
            marketCap: marketCap,  // 시가총액 (원 단위)
            recentNetIncome: incomeData ? incomeData.recentNetIncome : null,  // 최근 당기순이익
            recentNetIncomeYear: incomeData ? incomeData.recentYear : null,  // 최근 당기순이익 연도
            netIncomeGrowth: incomeData ? incomeData.growthRate : null,  // 당기순이익 성장률
            per: 12.5,  // PER 12.5배
            debtRatio: 28.3,  // 부채비율 28.3%
            quickRatio: 1.85,  // 당좌비율 1.85배
            dividendYield: 2.8,  // 시가배당률 2.8%
            dividend: 1500,  // 배당금 1500원
            totalAssets: 3500,  // 3500억원 (재무제표용)
            totalLiabilities: 1200,  // 1200억원 (재무제표용)
            totalEquity: 2300   // 2300억원 (재무제표용)
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
            description: "여기에 기업 개요 정보",   // 현재 더미 데이터
            chartData: chartData,
            financials: dummyFinancials,          // 더미 재무 데이터
            news: dummyNews                       // 더미 뉴스 데이터
        };

        // 신호등 색상을 템플릿에서 사용할 수 있도록 res.locals에 추가
        res.locals.getSignalColor = (value, metric) => {
            switch (metric) {
                case 'marketCap':
                    return getSignalColor(value, 'marketCap');
                case 'netIncomeGrowth':
                    return getSignalColor(value, 'netIncome');
                case 'per':
                    return getSignalColor(value, 'per');
                case 'debtRatio':
                    // 부채비율: 낮을수록 좋음 (30% 이하 좋음, 50% 이하 보통, 그 이상 나쁨)
                    if (value <= 30) return 'green';
                    if (value <= 50) return 'orange';
                    return 'red';
                case 'quickRatio':
                    // 당좌비율: 1.0 이상이 좋음
                    if (value >= 1.5) return 'green';
                    if (value >= 1.0) return 'orange';
                    return 'red';
                case 'dividendYield':
                    return getSignalColor(value, 'dividendYield');
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