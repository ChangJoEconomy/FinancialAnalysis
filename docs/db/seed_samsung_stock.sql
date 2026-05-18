-- ============================================================================
-- Step 3. Samsung Electronics stock master seed
-- Target: Supabase PostgreSQL public schema
-- ============================================================================

SET search_path TO public;

INSERT INTO stocks (
    stock_code,
    ticker,
    company_name_ko,
    company_name_en,
    market,
    dart_corp_code,
    industry_code,
    industry_name,
    is_active
) VALUES (
    '005930',
    '005930.KS',
    '삼성전자',
    'Samsung Electronics',
    'KOSPI',
    '00126380',
    NULL,
    '반도체 / 전자제품',
    TRUE
)
ON CONFLICT (stock_code) DO UPDATE SET
    ticker = EXCLUDED.ticker,
    company_name_ko = EXCLUDED.company_name_ko,
    company_name_en = EXCLUDED.company_name_en,
    market = EXCLUDED.market,
    dart_corp_code = EXCLUDED.dart_corp_code,
    industry_code = EXCLUDED.industry_code,
    industry_name = EXCLUDED.industry_name,
    is_active = EXCLUDED.is_active;

WITH samsung AS (
    SELECT stock_id
    FROM stocks
    WHERE stock_code = '005930'
)
INSERT INTO stock_aliases (stock_id, alias_name, alias_type)
SELECT stock_id, alias_name, alias_type::alias_type
FROM samsung
CROSS JOIN (
    VALUES
        ('삼성전자', 'company_name'),
        ('삼전', 'short_name'),
        ('005930', 'code'),
        ('Samsung Electronics', 'english_name'),
        ('Samsung', 'keyword')
) AS aliases(alias_name, alias_type)
ON CONFLICT (stock_id, alias_name) DO UPDATE SET
    alias_type = EXCLUDED.alias_type;

SELECT
    s.stock_id,
    s.stock_code,
    s.ticker,
    s.company_name_ko,
    s.company_name_en,
    s.market,
    s.dart_corp_code,
    s.industry_name,
    array_agg(a.alias_name ORDER BY a.alias_id) AS aliases
FROM stocks s
LEFT JOIN stock_aliases a ON a.stock_id = s.stock_id
WHERE s.stock_code = '005930'
GROUP BY s.stock_id;
