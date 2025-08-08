const asyncHandler = require('express-async-handler');
const yahooFinance = require('yahoo-finance2').default;
const UserStock = require('../models/UserStock');
const Preset = require('../models/Preset');
const DefaultPreset = require('../models/DefaultPreset');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const DART_API_KEY = process.env.DART_API_KEY;
const stocks = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/data/all_stocks.json'), 'utf-8'));

// json에서 기본 정보 가져오는 함수
function getStockInfoByTicker(ticker) {
    return stocks.find(stock => stock.ticker === ticker);
}

// 최근 당기순이익과 성장률 조회
async function getRecentNetIncomeGrowth(corpCode) {
    // DART_API_KEY가 전역 변수로 설정되어 있다고 가정합니다.
    if (!DART_API_KEY) {
        console.error('DART_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.');
        return null;
    }

    const currentYear = new Date().getFullYear();
    let years = [currentYear - 1, currentYear - 2];
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

    // 최신 연도 데이터가 없으면 한 해 더 과거로 이동
    if (results.recentNetIncome === null) {
        console.log(`${years[0]}년 데이터가 없어 ${currentYear - 2}년으로 재시도합니다.`);
        years = [currentYear - 2, currentYear - 3];
        results.recentNetIncome = await getIncomeDataForYear(years[0]);
        results.prevNetIncome = await getIncomeDataForYear(years[1]);
    }

    let growthRate = null;
    if (results.recentNetIncome !== null && results.prevNetIncome !== null || results.prevNetIncome === 0) {
        if(results.prevNetIncome > 0) { // 양수 -> {양수, 음수} 의 경우 일반적인 방식으로 성장률 계산
            growthRate = ((results.recentNetIncome - results.prevNetIncome) / results.prevNetIncome ) * 100;
        }
        else if(results.recentNetIncome > 0) { // 흑자 전환
            growthRate = Infinity; // 흑자 전환은 성장률을 무한대로 간주
        }
        else { // 이게 기업..?
            growthRate = -Infinity; // 적자 전환은 성장률을 음의 무한대로 간주
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

// 기본 가격정보와 차트 데이터 조회
async function fetchBasicAndChartData(code, market) {
    // 야후 파이낸스 심볼 변환
    let symbol = code;
    if (market === 'KOSPI') {
        symbol = `${code}.KS`;
    } else if (market === 'KOSDAQ') {
        symbol = `${code}.KQ`;
    }

    // Promise.all로 현재가와 차트 데이터 동시 요청
    const [quote, historical] = await Promise.all([
        yahooFinance.quote(symbol),
        yahooFinance.historical(symbol, {
            period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            period2: new Date(),
            interval: '1d'
        })
    ]);

    // 금일 가격정보
    const currentPrice = quote.regularMarketPrice;
    const changeAmount = quote.regularMarketChange;
    const changeRate = quote.regularMarketChangePercent;
    const marketCap = quote.marketCap;

    // 차트 데이터 변환
    const chartData = historical.map(item => ({
        date: item.date.toISOString().split('T')[0],
        price: item.close
    }));

    return { currentPrice, changeAmount, changeRate, marketCap, chartData };
}

// 부채비율과 총부채, 당좌비율, 유동부채 조회
async function getDebtInfo(corpCode) {
    const API_URL = 'https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json';
    const REPORT_CODE = '11011'; // 사업보고서
    const currentYear = new Date().getFullYear();

    let data = null;
    let balanceSheet = null;
    let targetYear = null;

    for (let year = currentYear - 1; year >= currentYear - 3; year--) {
        try {
            const response = await axios.get(API_URL, {
                params: {
                    crtfc_key: DART_API_KEY,
                    corp_code: corpCode,
                    bsns_year: year.toString(),
                    reprt_code: REPORT_CODE,
                    fs_div: 'CFS'
                }
            });

            const responseData = response.data;

            if (responseData.status === '000' && responseData.list && responseData.list.length > 0) {
                data = responseData;
                targetYear = year;
                balanceSheet = data.list.filter(item => item.sj_div === 'BS');
                if (balanceSheet.length > 0) break;
            }
        } catch (err) {
            // API 호출 오류는 무시하고, 작년 데이터로 다시 요청 시도
            // console.error(`Error fetching data for year ${year}:`, err);
        }
    }

    if (!data || !balanceSheet || balanceSheet.length === 0) {
        return null;
    }

    const totalDebt = balanceSheet.find(item =>
        item.account_nm.includes('부채총계') ||
        item.account_nm.includes('총부채')
    );
    const totalEquity = balanceSheet.find(item =>
        item.account_nm.includes('자본총계') ||
        item.account_nm.includes('총자본') ||
        item.account_nm.includes('자기자본')
    );

    // 유동자산, 재고자산, 선급비용, 유동부채 항목을 찾습니다.
    const currentAssetsItem = balanceSheet.find(item => item.account_nm.includes('유동자산'));
    const inventoriesItem = balanceSheet.find(item => item.account_nm.includes('재고자산'));
    const prepaidExpensesItem = balanceSheet.find(item => item.account_nm.includes('선급비용'));
    const currentLiabilitiesItem = balanceSheet.find(item => item.account_nm.includes('유동부채'));

    let debtRatio = null;
    let totalDebtAmount = null;
    let quickRatio = null;
    let currentLiabilitiesAmount = null;


    if (totalDebt && totalEquity) {
        const debtAmount = Number(totalDebt.thstrm_amount.replace(/,/g, ''));
        const equityAmount = Number(totalEquity.thstrm_amount.replace(/,/g, ''));
        if (equityAmount !== 0) {
            debtRatio = (debtAmount / equityAmount) * 100;
        }
        totalDebtAmount = debtAmount;
    }
    
    // quickRatio = (유동자산 - 재고자산 - 선급비용) / 유동부채
    if (currentAssetsItem && currentLiabilitiesItem) {
        // 재고자산, 선급비용은 없으면 0 처리
        const currentAssets = Number(currentAssetsItem.thstrm_amount.replace(/,/g, ''));
        const inventories = inventoriesItem ? Number(inventoriesItem.thstrm_amount.replace(/,/g, '')) : 0;
        const prepaidExpenses = prepaidExpensesItem ? Number(prepaidExpensesItem.thstrm_amount.replace(/,/g, '')) : 0;
        const currentLiabilities = Number(currentLiabilitiesItem.thstrm_amount.replace(/,/g, ''));

        const quickAssets = currentAssets - inventories - prepaidExpenses;

        if (currentLiabilities !== 0) {
            quickRatio = (quickAssets / currentLiabilities) * 100;
        }
        currentLiabilitiesAmount = currentLiabilities;
    }


    return {
        year: targetYear,
        debtRatio,
        totalDebt: totalDebtAmount,
        quickRatio,
        currentLiabilities: currentLiabilitiesAmount
    };
}

// 배당금 정보 조회
async function getCommonStockDividend(corpCode) {
  const currentYear = new Date().getFullYear();
  const yearsToTry = [currentYear - 1, currentYear - 2, currentYear - 3]; // 2024, 2023, 2022
  
  for (const year of yearsToTry) {
    try {
      const url = `https://opendart.fss.or.kr/api/alotMatter.json`;
      const response = await axios.get(url, {
        params: {
          crtfc_key: DART_API_KEY,
          corp_code: corpCode,
          bsns_year: year.toString(),
          reprt_code: "11011", // 사업보고서
        },
      });

      const data = response.data;

      if (data.status !== "000") {
        console.log(`${year}년: ${data.message} 배당금 조회 실패`);
        continue; // 다음 연도 시도
      }

      // 보통주 현금배당금 정보 찾기
      const commonDividendItem = data.list.find(item => 
        item.se === "주당 현금배당금(원)" && 
        item.stock_knd === "보통주" &&
        item.thstrm && item.thstrm !== "-"
      );

      // 보통주 현금배당수익률 정보 찾기
      const dividendYieldItem = data.list.find(item => 
        item.se === "현금배당수익률(%)" && 
        item.stock_knd === "보통주"
      );

      if (!commonDividendItem) {
        console.log(`${year}년: 보통주 배당금 정보 없음`);
        continue; // 다음 연도 시도
      }

      // 당기 데이터만 반환
      const result = {
        year: year,
        dividendPerShare: commonDividendItem.thstrm, // 주당 현금배당금
        dividendYield: dividendYieldItem ? dividendYieldItem.thstrm : null, // 현금배당수익률
      };

      return result;

    } catch (error) {
      continue; // 다음 연도 시도
    }
  }

  console.log("모든 연도에서 배당 정보를 찾을 수 없습니다.");
  return null;
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
        const name_info = getStockInfoByTicker(code);
        if (!name_info) {
            return res.status(400).render('error', {
                title: '오류',
                message: '주식 정보를 찾을 수 없습니다. 잠시후 다시 시도해주세요.'
            });
        }
        const companyName = name_info.name;
        const corp_code = name_info.corp_code;
        const market = name_info.market;

        // 기본정보와 차트 데이터
        const { currentPrice, changeAmount, changeRate, marketCap, chartData } = await fetchBasicAndChartData(code, market);

        // 당기 순이익 성장률 계산
        const incomeData = await getRecentNetIncomeGrowth(corp_code);

        // PER 계산
        let per = null;
        if (marketCap && incomeData && incomeData.recentNetIncome) {
            per = (marketCap / (incomeData.recentNetIncome));
        }

        // 부채관련 모든정보 조회
        const debtInfo = await getDebtInfo(corp_code);
        const debtRatio = debtInfo ? debtInfo.debtRatio : null;
        const debtYear = debtInfo ? debtInfo.year : null;
        const totalDebt = debtInfo ? debtInfo.totalDebt : null;
        const quickRatio = debtInfo ? debtInfo.quickRatio : null;
        const currentLiabilities = debtInfo ? debtInfo.currentLiabilities : null;

        // 배당수익률 계산
        const dividendInfo = await getCommonStockDividend(corp_code);

        // 재무 데이터 생성
        const Financials = {
            // 시가총액
            marketCap: marketCap,
            // 당기 순이익
            recentNetIncome: incomeData ? incomeData.recentNetIncome : null,
            recentNetIncomeYear: incomeData ? incomeData.recentYear : null,
            netIncomeGrowth: incomeData ? incomeData.growthRate : null,
            // PER
            per: per,
            // 부채비율
            debtRatio: debtRatio,
            debtYear: debtYear,
            totalDebt: totalDebt,
            // 당좌비율
            quickRatio: quickRatio,
            quickYear: debtYear,
            currentLiabilities: currentLiabilities,
            // 배당금 정보
            dividendYield: dividendInfo ? parseFloat(dividendInfo.dividendYield) : null,
            dividend: dividendInfo ? dividendInfo.dividendPerShare : null,
            dividendYear: dividendInfo ? dividendInfo.year : null,
        };
        // --------------------------------------------------------------------------------------------------------

        const stock = {
            name: companyName,
            code: code,
            market: market,
            currentPrice: currentPrice,
            changeAmount: changeAmount,
            changeRate: changeRate,
            chartData: chartData,
            financials: Financials,
        };

        // 내 종목 여부 확인
        let isFavorite = false;
        if (req.user) {
            isFavorite = await UserStock.exists({
                user_id: req.user.user_id,
                stock_code: code
            });
        }

        // 사용자의 모든 프리셋과 기본 프리셋 정보 가져오기
        let presets = [];
        let defaultPresetName = null;
        
        if (req.user) {
            // 사용자의 모든 프리셋 조회
            presets = await Preset.find({ user_id: req.user.user_id });
            
            // 기본 프리셋 조회
            const defaultPreset = await DefaultPreset.findOne({ user_id: req.user.user_id });
            if (defaultPreset) {
                defaultPresetName = defaultPreset.preset_name;
            }
        }

        res.render('stock-details', {
            title: `${stock.name} 정보`,
            stock: stock,
            user: req.user,
            isFavorite,
            presets: presets,
            defaultPresetName: defaultPresetName
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