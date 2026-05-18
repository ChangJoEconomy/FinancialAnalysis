-- ============================================================================
-- Stock AI Service Metric Seed Data
-- Run after stock_ai_supabase_public_reset.sql
-- ============================================================================

SET search_path TO public;

INSERT INTO metric_definitions (
    metric_code,
    metric_name_ko,
    metric_name_en,
    description_beginner,
    formula_text,
    unit,
    good_direction,
    category,
    display_order
) VALUES
(
    'PER',
    '주가수익비율',
    'Price Earnings Ratio',
    '현재 주가가 회사 이익에 비해 비싼지 싼지 보는 지표입니다. 같은 업종 평균과 비교해서 해석하는 것이 좋습니다.',
    '시가총액 / 당기순이익 또는 주가 / EPS',
    '배',
    'lower_better',
    'valuation',
    10
),
(
    'PBR',
    '주가순자산비율',
    'Price Book-value Ratio',
    '현재 주가가 회사 순자산에 비해 어느 정도로 평가되는지 보는 지표입니다.',
    '시가총액 / 자본총계 또는 주가 / BPS',
    '배',
    'lower_better',
    'valuation',
    20
),
(
    'ROE',
    '자기자본이익률',
    'Return On Equity',
    '회사가 자기자본으로 얼마나 효율적으로 이익을 내는지 보는 지표입니다.',
    '당기순이익 / 자본총계 * 100',
    '%',
    'higher_better',
    'profitability',
    30
),
(
    'DEBT_RATIO',
    '부채비율',
    'Debt Ratio',
    '회사 자본에 비해 부채가 얼마나 많은지 보는 안정성 지표입니다.',
    '부채총계 / 자본총계 * 100',
    '%',
    'lower_better',
    'stability',
    40
),
(
    'OPERATING_MARGIN',
    '영업이익률',
    'Operating Margin',
    '매출 중 본업에서 실제 이익으로 남는 비율입니다.',
    '영업이익 / 매출액 * 100',
    '%',
    'higher_better',
    'profitability',
    50
),
(
    'REVENUE_GROWTH',
    '매출 성장률',
    'Revenue Growth',
    '이전 기간보다 매출이 얼마나 증가했는지 보는 성장성 지표입니다.',
    '(현재 매출액 - 이전 매출액) / 이전 매출액 * 100',
    '%',
    'higher_better',
    'growth',
    60
),
(
    'OPERATING_PROFIT_GROWTH',
    '영업이익 성장률',
    'Operating Profit Growth',
    '이전 기간보다 본업 이익이 얼마나 증가했는지 보는 성장성 지표입니다.',
    '(현재 영업이익 - 이전 영업이익) / 이전 영업이익 * 100',
    '%',
    'higher_better',
    'growth',
    70
),
(
    'CASH_RATIO',
    '현금성 자산 비율',
    'Cash Ratio',
    '단기적으로 사용할 수 있는 현금성 자산이 충분한지 보는 안정성 지표입니다.',
    '현금및현금성자산 / 유동부채 * 100',
    '%',
    'higher_better',
    'liquidity',
    80
)
ON CONFLICT (metric_code) DO NOTHING;

