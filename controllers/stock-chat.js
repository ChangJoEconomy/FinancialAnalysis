const asyncHandler = require('express-async-handler');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Gemini API 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc Chat with AI about stock analysis
// @route POST /api/stock-chat
const stockChat = asyncHandler(async (req, res) => {
    const { message, stock } = req.body;

    if (!message || !stock) {
        return res.status(400).json({
            success: false,
            message: '메시지와 주식 정보가 필요합니다.'
        });
    }

    try {
        // Gemini AI를 사용한 응답 생성
        const response = await generateGeminiResponse(message, stock);

        console.log('AI Response:', response);

        res.json({
            success: true,
            response: response
        });

    } catch (error) {
        console.error('Stock chat error:', error);
        res.status(500).json({
            success: false,
            message: 'AI 응답 생성 중 오류가 발생했습니다.'
        });
    }
});

// Gemini AI를 사용한 응답 생성 함수
async function generateGeminiResponse(message, stock) {
    try {
        // Gemini 2.5 Flash 모델 사용
        const model = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash-exp",
            tools: [
                {
                    googleSearch: {}
                }
            ]
        });

        // 주식 정보를 포함한 프롬프트 생성
        const stockInfo = formatStockInfo(stock);
        const prompt = `
당신은 전문적인 주식 분석가입니다. 다음 주식에 대한 질문에 답해주세요:

주식 정보:
${stockInfo}

사용자 질문: ${message}

답변 시 다음 지침을 따라주세요:
1. 제공된 재무 데이터를 기반으로 분석하되, 최신 정보가 필요하면 구글 검색을 활용하세요
2. 구체적이고 전문적인 분석을 제공하되 이해하기 쉽게 설명하세요
3. 투자 추천이나 매수/매도 권유는 하지 마세요
4. 불확실한 정보는 명확히 표시하고, 추가 조사가 필요함을 알려주세요
5. 인터넷 검색을 적극 활용해서 최신 정보를 많이 알려주세요
6. 인터넷 검색 결과의 출처는 필요 없어 대신 기준 날짜 표기는 좋아
7. 한국어로 답변하세요
8. 답변은 300자 이내로 간결하게 작성하세요

답변:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return text || '죄송합니다. 현재 응답을 생성할 수 없습니다. 잠시 후 다시 시도해주세요.';

    } catch (error) {
        console.error('Gemini API error:', error);
        // 폴백으로 기본 응답 제공
        return generateFallbackResponse(message, stock);
    }
}

// 주식 정보를 포맷팅하는 함수
function formatStockInfo(stock) {
    const formatNumber = (num, unit = '원') => {
        if (num === null || num === undefined || isNaN(Number(num))) {
            return '데이터 없음';
        }
        
        const value = Number(num);
        if (unit === '원' && value >= 1_000_000_000_000) {
            return Math.floor(value / 1_000_000_000_000) + '조' + unit;
        } else if (unit === '원' && value >= 100_000_000) {
            return Math.floor(value / 100_000_000) + '억' + unit;
        }
        
        return value.toLocaleString() + unit;
    };

    // 당기순이익 성장률 처리
    let netIncomeGrowthStr = '데이터 없음';
    const netIncomeGrowth = stock.financials?.netIncomeGrowth;
    if (netIncomeGrowth !== undefined && netIncomeGrowth !== null) {
        if (netIncomeGrowth === Infinity || netIncomeGrowth === "Infinity") {
            netIncomeGrowthStr = '흑자전환';
        } else if (netIncomeGrowth === -Infinity || netIncomeGrowth === "-Infinity") {
            netIncomeGrowthStr = '적자 지속';
        } else if (!isNaN(Number(netIncomeGrowth))) {
            netIncomeGrowthStr = Number(netIncomeGrowth).toFixed(1) + '%';
        }
    }

    return `
기업명: ${stock.name}
종목코드: ${stock.code}
시장: ${stock.market}
현재가: ${formatNumber(stock.currentPrice)}

재무정보:
- 시가총액: ${formatNumber(stock.financials?.marketCap)}
- PER: ${stock.financials?.per ? Number(stock.financials.per).toFixed(1) + '배' : '데이터 없음'}
- 부채비율: ${stock.financials?.debtRatio ? Number(stock.financials.debtRatio).toFixed(1) + '%' : '데이터 없음'}
- 당좌비율: ${stock.financials?.quickRatio ? Number(stock.financials.quickRatio).toFixed(2) + '배' : '배당 없음'}
- 시가배당률: ${stock.financials?.dividendYield ? Number(stock.financials.dividendYield).toFixed(2) + '%' : '데이터 없음'}
- 당기순이익 성장률: ${netIncomeGrowthStr}
    `;
}

// 폴백 응답 함수 (Gemini API 실패 시 사용)
function generateFallbackResponse(message, stock) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('시가총액')) {
        const marketCap = stock.financials?.marketCap;
        if (marketCap) {
            const trillion = 1_000_000_000_000;
            const displayCap = marketCap >= trillion 
                ? Math.floor(marketCap / trillion) + '조원' 
                : Math.floor(marketCap / 100_000_000) + '억원';
            return `${stock.name}의 시가총액은 약 ${displayCap}입니다.`;
        }
    }
    
    if (lowerMessage.includes('per')) {
        const per = stock.financials?.per;
        if (per && !isNaN(Number(per))) {
            return `${stock.name}의 PER은 ${Number(per).toFixed(1)}배입니다.`;
        }
    }
    
    return `${stock.name}에 대한 질문을 받았지만, 현재 상세한 분석을 제공할 수 없습니다. 다시 시도해주세요.`;
}

module.exports = {
    stockChat
};
