-- ============================================================================
-- Stock AI Service Supabase Public RESET DDL
-- Version: 1.1-supabase-reset
-- Target DB: Supabase PostgreSQL
--
-- Use this file in Supabase SQL Editor when the first DDL seemed to create
-- no tables. This version creates every object in the public schema, which is
-- the schema Supabase shows/exposes by default.
--
-- WARNING
--   This is a development reset script. It drops and recreates the project
--   tables/types/views below in public. Do not run it after saving real data.
--
-- Note
--   The earlier DDL created a custom schema named stock_ai. Those tables can be
--   real but hidden from the default Supabase Table Editor view/API exposure.
--   This script does not drop stock_ai automatically. If you want to remove it
--   after confirming there is no data to keep, run:
--     DROP SCHEMA IF EXISTS stock_ai CASCADE;
-- ============================================================================

SET search_path TO public;

-- Drop dependent views first
DROP VIEW IF EXISTS favorite_stocks_with_latest_analysis CASCADE;
DROP VIEW IF EXISTS latest_ai_analysis_per_stock CASCADE;

-- Drop project tables in dependency-safe order
DROP TABLE IF EXISTS ai_chat_messages CASCADE;
DROP TABLE IF EXISTS ai_chat_sessions CASCADE;
DROP TABLE IF EXISTS news_ai_analyses CASCADE;
DROP TABLE IF EXISTS stock_news CASCADE;
DROP TABLE IF EXISTS news_articles CASCADE;
DROP TABLE IF EXISTS ai_analysis_evidences CASCADE;
DROP TABLE IF EXISTS ai_metric_analysis_items CASCADE;
DROP TABLE IF EXISTS ai_analysis_runs CASCADE;
DROP TABLE IF EXISTS industry_metric_benchmarks CASCADE;
DROP TABLE IF EXISTS financial_metric_values CASCADE;
DROP TABLE IF EXISTS metric_definitions CASCADE;
DROP TABLE IF EXISTS financial_line_items CASCADE;
DROP TABLE IF EXISTS financial_statement_snapshots CASCADE;
DROP TABLE IF EXISTS stock_prices_daily CASCADE;
DROP TABLE IF EXISTS stock_price_cache_ranges CASCADE;
DROP TABLE IF EXISTS external_data_cache_files CASCADE;
DROP TABLE IF EXISTS favorite_stocks CASCADE;
DROP TABLE IF EXISTS stock_search_histories CASCADE;
DROP TABLE IF EXISTS stock_aliases CASCADE;
DROP TABLE IF EXISTS stocks CASCADE;
DROP TABLE IF EXISTS user_analysis_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop project enum types and trigger function
DROP TYPE IF EXISTS login_provider_type CASCADE;
DROP TYPE IF EXISTS user_status_type CASCADE;
DROP TYPE IF EXISTS risk_type CASCADE;
DROP TYPE IF EXISTS market_type CASCADE;
DROP TYPE IF EXISTS alias_type CASCADE;
DROP TYPE IF EXISTS period_type CASCADE;
DROP TYPE IF EXISTS statement_type CASCADE;
DROP TYPE IF EXISTS metric_direction_type CASCADE;
DROP TYPE IF EXISTS metric_category_type CASCADE;
DROP TYPE IF EXISTS signal_level_type CASCADE;
DROP TYPE IF EXISTS analysis_type CASCADE;
DROP TYPE IF EXISTS evidence_type CASCADE;
DROP TYPE IF EXISTS sentiment_type CASCADE;
DROP TYPE IF EXISTS impact_term_type CASCADE;
DROP TYPE IF EXISTS chat_role_type CASCADE;
DROP TYPE IF EXISTS fetch_status_type CASCADE;
DROP FUNCTION IF EXISTS set_updated_at() CASCADE;

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE login_provider_type AS ENUM ('local', 'google', 'kakao', 'naver');
CREATE TYPE user_status_type AS ENUM ('active', 'withdrawn', 'blocked');
CREATE TYPE risk_type AS ENUM ('conservative', 'balanced', 'growth');

CREATE TYPE market_type AS ENUM ('KOSPI', 'KOSDAQ', 'KONEX', 'ETF', 'ETN', 'OTHER');
CREATE TYPE alias_type AS ENUM ('company_name', 'short_name', 'keyword', 'code', 'english_name');

CREATE TYPE period_type AS ENUM ('annual', 'quarterly');
CREATE TYPE statement_type AS ENUM ('balance_sheet', 'income_statement', 'cash_flow', 'comprehensive_income', 'other');

CREATE TYPE metric_direction_type AS ENUM ('higher_better', 'lower_better', 'range_better', 'neutral');
CREATE TYPE metric_category_type AS ENUM ('stability', 'growth', 'profitability', 'valuation', 'liquidity', 'efficiency', 'other');

CREATE TYPE signal_level_type AS ENUM ('green', 'orange', 'red', 'gray');
CREATE TYPE analysis_type AS ENUM ('financial', 'news', 'price', 'summary', 'combined');
CREATE TYPE evidence_type AS ENUM ('financial_metric', 'news_article', 'disclosure', 'price', 'external_file', 'manual');

CREATE TYPE sentiment_type AS ENUM ('positive', 'negative', 'neutral', 'mixed');
CREATE TYPE impact_term_type AS ENUM ('short_term', 'mid_term', 'long_term', 'unknown');

CREATE TYPE chat_role_type AS ENUM ('system', 'user', 'assistant');
CREATE TYPE fetch_status_type AS ENUM ('success', 'failed', 'skipped', 'partial');

-- ============================================================================
-- 2. COMMON TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. USER DOMAIN
-- ============================================================================

CREATE TABLE users (
    user_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email               VARCHAR(255) NOT NULL,
    password_hash       VARCHAR(255),
    nickname            VARCHAR(80) NOT NULL,
    login_provider      login_provider_type NOT NULL DEFAULT 'local',
    provider_user_id    VARCHAR(255),
    status              user_status_type NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at       TIMESTAMPTZ,

    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT uq_users_provider_user UNIQUE (login_provider, provider_user_id),
    CONSTRAINT chk_users_password_for_local CHECK (
        login_provider <> 'local' OR password_hash IS NOT NULL
    )
);

COMMENT ON TABLE users IS '회원 계정 정보. local 로그인은 password_hash 필수, 소셜 로그인은 provider_user_id 사용.';

CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_analysis_settings (
    setting_id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id                 BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    setting_name            VARCHAR(100) NOT NULL,
    risk_type               risk_type NOT NULL DEFAULT 'balanced',
    stability_weight        NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    growth_weight           NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    profitability_weight    NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    valuation_weight        NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    news_weight             NUMERIC(5,2) NOT NULL DEFAULT 1.00,
    is_default              BOOLEAN NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_analysis_settings_name UNIQUE (user_id, setting_name),
    CONSTRAINT chk_user_analysis_settings_weights CHECK (
        stability_weight >= 0
        AND growth_weight >= 0
        AND profitability_weight >= 0
        AND valuation_weight >= 0
        AND news_weight >= 0
    )
);

COMMENT ON TABLE user_analysis_settings IS '보수적 분석, 성장성 중시 등 사용자별 AI 분석 설정.';

CREATE UNIQUE INDEX uq_user_analysis_settings_one_default
ON user_analysis_settings(user_id)
WHERE is_default = TRUE;

CREATE TRIGGER trg_user_analysis_settings_set_updated_at
BEFORE UPDATE ON user_analysis_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- 4. STOCK MASTER DOMAIN
-- ============================================================================

CREATE TABLE stocks (
    stock_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stock_code          VARCHAR(20) NOT NULL,
    ticker              VARCHAR(30),
    company_name_ko     VARCHAR(200) NOT NULL,
    company_name_en     VARCHAR(200),
    market              market_type NOT NULL,
    dart_corp_code      VARCHAR(20),
    industry_code       VARCHAR(30),
    industry_name       VARCHAR(200),
    listed_at           DATE,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_stocks_stock_code UNIQUE (stock_code),
    CONSTRAINT uq_stocks_ticker UNIQUE (ticker),
    CONSTRAINT uq_stocks_dart_corp_code UNIQUE (dart_corp_code)
);

COMMENT ON TABLE stocks IS '상장 종목 마스터. 종목코드는 005930처럼 앞자리 0 보존을 위해 문자열로 저장.';

CREATE INDEX idx_stocks_company_name_ko ON stocks(company_name_ko);
CREATE INDEX idx_stocks_market ON stocks(market);
CREATE INDEX idx_stocks_industry_code ON stocks(industry_code);
CREATE INDEX idx_stocks_active ON stocks(is_active);

CREATE TRIGGER trg_stocks_set_updated_at
BEFORE UPDATE ON stocks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE stock_aliases (
    alias_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stock_id        BIGINT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    alias_name      VARCHAR(200) NOT NULL,
    alias_type      alias_type NOT NULL DEFAULT 'keyword',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_stock_aliases_stock_alias UNIQUE (stock_id, alias_name)
);

COMMENT ON TABLE stock_aliases IS '삼성전자, 삼전, 005930 등 종목 검색 별칭.';

CREATE INDEX idx_stock_aliases_alias_name ON stock_aliases(alias_name);
CREATE INDEX idx_stock_aliases_stock_id ON stock_aliases(stock_id);

-- ============================================================================
-- 5. USER ACTIVITY DOMAIN
-- ============================================================================

CREATE TABLE stock_search_histories (
    search_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    query_text      VARCHAR(200) NOT NULL,
    stock_id        BIGINT REFERENCES stocks(stock_id) ON DELETE SET NULL,
    result_count    INTEGER NOT NULL DEFAULT 0,
    searched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_stock_search_histories_result_count CHECK (result_count >= 0)
);

COMMENT ON TABLE stock_search_histories IS '사용자 종목 검색 기록. 최근 본 종목, 인기 검색 종목 산출에 사용.';

CREATE INDEX idx_stock_search_histories_user_time ON stock_search_histories(user_id, searched_at DESC);
CREATE INDEX idx_stock_search_histories_stock_time ON stock_search_histories(stock_id, searched_at DESC);
CREATE INDEX idx_stock_search_histories_query_time ON stock_search_histories(query_text, searched_at DESC);

CREATE TABLE favorite_stocks (
    favorite_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    stock_id        BIGINT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    memo            VARCHAR(500),
    display_order   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_favorite_stocks_user_stock UNIQUE (user_id, stock_id)
);

COMMENT ON TABLE favorite_stocks IS '사용자 관심종목 목록.';

CREATE INDEX idx_favorite_stocks_user_order ON favorite_stocks(user_id, display_order, created_at DESC);
CREATE INDEX idx_favorite_stocks_stock_id ON favorite_stocks(stock_id);

-- ============================================================================
-- 6. LOCAL CACHE METADATA DOMAIN
-- ============================================================================
-- Large raw data is stored as local files on the server, e.g.
--   /data/stock-ai-cache/prices/daily/005930/2024.parquet
--   /data/stock-ai-cache/dart/005930/2024_annual.json
--   /data/stock-ai-cache/news/005930/2025-01.json
-- DB stores only metadata and pointers to keep DB size under control.
-- ============================================================================

CREATE TABLE external_data_cache_files (
    cache_file_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provider            VARCHAR(50) NOT NULL,
    cache_type          VARCHAR(80) NOT NULL,
    target_type         VARCHAR(80) NOT NULL,
    target_id           VARCHAR(120),
    stock_id            BIGINT REFERENCES stocks(stock_id) ON DELETE SET NULL,
    logical_key         VARCHAR(500) NOT NULL,
    file_path           TEXT NOT NULL,
    file_format         VARCHAR(30) NOT NULL,
    compression         VARCHAR(30),
    content_hash        VARCHAR(128),
    byte_size           BIGINT,
    row_count           BIGINT,
    period_start        DATE,
    period_end          DATE,
    fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    metadata            JSONB NOT NULL DEFAULT '{}'::JSONB,

    CONSTRAINT uq_external_data_cache_files_logical_key UNIQUE (logical_key),
    CONSTRAINT uq_external_data_cache_files_file_path UNIQUE (file_path),
    CONSTRAINT chk_external_data_cache_files_byte_size CHECK (byte_size IS NULL OR byte_size >= 0),
    CONSTRAINT chk_external_data_cache_files_row_count CHECK (row_count IS NULL OR row_count >= 0)
);

COMMENT ON TABLE external_data_cache_files IS '서버 로컬 파일 캐시 메타데이터. 대용량 주가/DART/뉴스 원본은 DB가 아닌 파일로 저장.';

CREATE INDEX idx_external_cache_stock_type ON external_data_cache_files(stock_id, cache_type, period_start, period_end);
CREATE INDEX idx_external_cache_expire ON external_data_cache_files(expires_at) WHERE is_active = TRUE;
CREATE INDEX idx_external_cache_provider_type ON external_data_cache_files(provider, cache_type);

CREATE TABLE stock_price_cache_ranges (
    price_cache_id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stock_id            BIGINT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    interval_type       VARCHAR(20) NOT NULL DEFAULT 'daily',
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    adjusted            BOOLEAN NOT NULL DEFAULT TRUE,
    cache_file_id       BIGINT NOT NULL REFERENCES external_data_cache_files(cache_file_id) ON DELETE CASCADE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_stock_price_cache_ranges UNIQUE (stock_id, interval_type, period_start, period_end, adjusted),
    CONSTRAINT chk_stock_price_cache_ranges_period CHECK (period_start <= period_end)
);

COMMENT ON TABLE stock_price_cache_ranges IS '장기 주가 데이터 로컬 파일 캐시 범위. DB에는 범위와 파일 위치만 저장.';

CREATE INDEX idx_stock_price_cache_ranges_lookup ON stock_price_cache_ranges(stock_id, interval_type, period_start, period_end);

-- ============================================================================
-- 7. RECENT PRICE DOMAIN
-- ============================================================================
-- This table is for short-term display/cache only, e.g. recent 30~90 trading days.
-- Long history should be stored in local files and tracked by stock_price_cache_ranges.
-- ============================================================================

CREATE TABLE stock_prices_daily (
    price_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stock_id            BIGINT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    trade_date          DATE NOT NULL,
    open_price          NUMERIC(18,4),
    high_price          NUMERIC(18,4),
    low_price           NUMERIC(18,4),
    close_price         NUMERIC(18,4) NOT NULL,
    adjusted_close      NUMERIC(18,4),
    volume              BIGINT,
    change_amount       NUMERIC(18,4),
    change_rate         NUMERIC(9,4),
    source_provider     VARCHAR(50) NOT NULL,
    fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_stock_prices_daily_stock_date UNIQUE (stock_id, trade_date),
    CONSTRAINT chk_stock_prices_daily_volume CHECK (volume IS NULL OR volume >= 0)
);

COMMENT ON TABLE stock_prices_daily IS '최근 차트 표시용 일별 주가 캐시. 장기 전체 주가를 넣지 말고 최근 구간만 유지.';

CREATE INDEX idx_stock_prices_daily_stock_date_desc ON stock_prices_daily(stock_id, trade_date DESC);
CREATE INDEX idx_stock_prices_daily_trade_date ON stock_prices_daily(trade_date DESC);

-- ============================================================================
-- 8. FINANCIAL STATEMENT DOMAIN
-- ============================================================================

CREATE TABLE financial_statement_snapshots (
    statement_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stock_id            BIGINT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    fiscal_year         INTEGER NOT NULL,
    fiscal_quarter      SMALLINT NOT NULL DEFAULT 0,
    period_type         period_type NOT NULL,
    statement_type      statement_type NOT NULL,
    currency            VARCHAR(10) NOT NULL DEFAULT 'KRW',
    report_name         VARCHAR(200),
    dart_report_no      VARCHAR(50),
    source_provider     VARCHAR(50) NOT NULL DEFAULT 'DART',
    cache_file_id       BIGINT REFERENCES external_data_cache_files(cache_file_id) ON DELETE SET NULL,
    fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data_version        VARCHAR(50),

    CONSTRAINT uq_financial_statement_snapshots UNIQUE (
        stock_id, fiscal_year, fiscal_quarter, period_type, statement_type, dart_report_no
    ),
    CONSTRAINT chk_financial_statement_snapshots_year CHECK (fiscal_year BETWEEN 1900 AND 2200),
    CONSTRAINT chk_financial_statement_snapshots_quarter CHECK (fiscal_quarter BETWEEN 0 AND 4)
);

COMMENT ON TABLE financial_statement_snapshots IS 'DART 등에서 가져온 재무제표 스냅샷 메타데이터. 원본 응답은 cache_file_id로 로컬 파일 참조.';

CREATE INDEX idx_financial_statement_stock_period ON financial_statement_snapshots(stock_id, fiscal_year DESC, fiscal_quarter DESC);
CREATE INDEX idx_financial_statement_cache_file ON financial_statement_snapshots(cache_file_id);

CREATE TABLE financial_line_items (
    line_item_id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    statement_id        BIGINT NOT NULL REFERENCES financial_statement_snapshots(statement_id) ON DELETE CASCADE,
    account_code        VARCHAR(100),
    account_name        VARCHAR(200) NOT NULL,
    amount              NUMERIC(24,4),
    unit                VARCHAR(30) NOT NULL DEFAULT 'KRW',
    display_order       INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE financial_line_items IS '재무제표 주요 원본 항목. 매출액, 영업이익, 자산총계, 부채총계 등.';

CREATE INDEX idx_financial_line_items_statement ON financial_line_items(statement_id, display_order);
CREATE INDEX idx_financial_line_items_account_name ON financial_line_items(account_name);
CREATE UNIQUE INDEX uq_financial_line_items_statement_account
ON financial_line_items(statement_id, account_name, COALESCE(account_code, ''));

-- ============================================================================
-- 9. FINANCIAL METRIC DOMAIN
-- ============================================================================

CREATE TABLE metric_definitions (
    metric_code             VARCHAR(50) PRIMARY KEY,
    metric_name_ko          VARCHAR(100) NOT NULL,
    metric_name_en          VARCHAR(100),
    description_beginner    TEXT,
    formula_text            TEXT,
    unit                    VARCHAR(30),
    good_direction          metric_direction_type NOT NULL DEFAULT 'neutral',
    category                metric_category_type NOT NULL DEFAULT 'other',
    display_order           INTEGER NOT NULL DEFAULT 0,
    is_active               BOOLEAN NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE metric_definitions IS 'PER, ROE, 부채비율 등 지표 정의와 초보자용 설명.';

CREATE INDEX idx_metric_definitions_category_order ON metric_definitions(category, display_order);

CREATE TRIGGER trg_metric_definitions_set_updated_at
BEFORE UPDATE ON metric_definitions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE financial_metric_values (
    metric_value_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stock_id                 BIGINT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    metric_code              VARCHAR(50) NOT NULL REFERENCES metric_definitions(metric_code) ON DELETE RESTRICT,
    fiscal_year              INTEGER NOT NULL,
    fiscal_quarter           SMALLINT NOT NULL DEFAULT 0,
    period_type              period_type NOT NULL,
    metric_value             NUMERIC(24,6),
    unit                     VARCHAR(30),
    industry_avg_value       NUMERIC(24,6),
    previous_value           NUMERIC(24,6),
    change_rate              NUMERIC(12,6),
    source_statement_id      BIGINT REFERENCES financial_statement_snapshots(statement_id) ON DELETE SET NULL,
    calculated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_financial_metric_values UNIQUE (
        stock_id, metric_code, fiscal_year, fiscal_quarter, period_type
    ),
    CONSTRAINT chk_financial_metric_values_year CHECK (fiscal_year BETWEEN 1900 AND 2200),
    CONSTRAINT chk_financial_metric_values_quarter CHECK (fiscal_quarter BETWEEN 0 AND 4)
);

COMMENT ON TABLE financial_metric_values IS '종목별 주요 재무 지표값. AI 신호등 분석의 핵심 입력.';

CREATE INDEX idx_financial_metric_values_stock_period ON financial_metric_values(stock_id, fiscal_year DESC, fiscal_quarter DESC);
CREATE INDEX idx_financial_metric_values_metric_period ON financial_metric_values(metric_code, fiscal_year DESC, fiscal_quarter DESC);

CREATE TABLE industry_metric_benchmarks (
    benchmark_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    industry_code           VARCHAR(30) NOT NULL,
    industry_name           VARCHAR(200),
    metric_code             VARCHAR(50) NOT NULL REFERENCES metric_definitions(metric_code) ON DELETE RESTRICT,
    fiscal_year             INTEGER NOT NULL,
    fiscal_quarter          SMALLINT NOT NULL DEFAULT 0,
    period_type             period_type NOT NULL,
    avg_value               NUMERIC(24,6),
    median_value            NUMERIC(24,6),
    sample_count            INTEGER,
    source_provider         VARCHAR(50),
    calculated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_industry_metric_benchmarks UNIQUE (
        industry_code, metric_code, fiscal_year, fiscal_quarter, period_type
    ),
    CONSTRAINT chk_industry_metric_benchmarks_year CHECK (fiscal_year BETWEEN 1900 AND 2200),
    CONSTRAINT chk_industry_metric_benchmarks_quarter CHECK (fiscal_quarter BETWEEN 0 AND 4),
    CONSTRAINT chk_industry_metric_benchmarks_sample_count CHECK (sample_count IS NULL OR sample_count >= 0)
);

COMMENT ON TABLE industry_metric_benchmarks IS '업종 평균/중앙값 지표. 업종 대비 높고 낮음을 판단하는 기준.';

CREATE INDEX idx_industry_metric_benchmarks_lookup ON industry_metric_benchmarks(industry_code, metric_code, fiscal_year DESC, fiscal_quarter DESC);

-- ============================================================================
-- 10. AI ANALYSIS DOMAIN
-- ============================================================================

CREATE TABLE ai_analysis_runs (
    analysis_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT REFERENCES users(user_id) ON DELETE SET NULL,
    stock_id            BIGINT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    setting_id          BIGINT REFERENCES user_analysis_settings(setting_id) ON DELETE SET NULL,
    analysis_type       analysis_type NOT NULL DEFAULT 'financial',
    overall_signal      signal_level_type NOT NULL DEFAULT 'gray',
    overall_score       NUMERIC(6,2),
    summary_text        TEXT NOT NULL,
    reason_text         TEXT,
    caution_text        TEXT,
    source_period       VARCHAR(100),
    source_data_hash    VARCHAR(128),
    model_name          VARCHAR(100),
    prompt_version      VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ,

    CONSTRAINT chk_ai_analysis_runs_score CHECK (overall_score IS NULL OR overall_score BETWEEN 0 AND 100)
);

COMMENT ON TABLE ai_analysis_runs IS '종목별 AI 분석 실행 결과. 매수/매도 추천이 아니라 초보자용 해석과 신호등 결과 저장.';

CREATE INDEX idx_ai_analysis_runs_stock_type_time ON ai_analysis_runs(stock_id, analysis_type, created_at DESC);
CREATE INDEX idx_ai_analysis_runs_user_time ON ai_analysis_runs(user_id, created_at DESC);
CREATE INDEX idx_ai_analysis_runs_signal ON ai_analysis_runs(overall_signal);
CREATE INDEX idx_ai_analysis_runs_expires ON ai_analysis_runs(expires_at);
CREATE INDEX idx_ai_analysis_runs_cache_lookup ON ai_analysis_runs(stock_id, analysis_type, source_data_hash, prompt_version);

CREATE TABLE ai_metric_analysis_items (
    item_id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    analysis_id             BIGINT NOT NULL REFERENCES ai_analysis_runs(analysis_id) ON DELETE CASCADE,
    metric_code             VARCHAR(50) NOT NULL REFERENCES metric_definitions(metric_code) ON DELETE RESTRICT,
    metric_value            NUMERIC(24,6),
    industry_avg_value      NUMERIC(24,6),
    previous_value          NUMERIC(24,6),
    signal                  signal_level_type NOT NULL DEFAULT 'gray',
    score                   NUMERIC(6,2),
    reason_text             TEXT,
    beginner_explanation    TEXT,
    check_point_text        TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_ai_metric_analysis_items UNIQUE (analysis_id, metric_code),
    CONSTRAINT chk_ai_metric_analysis_items_score CHECK (score IS NULL OR score BETWEEN 0 AND 100)
);

COMMENT ON TABLE ai_metric_analysis_items IS '개별 지표별 AI 신호등 결과와 판단 이유.';

CREATE INDEX idx_ai_metric_analysis_items_analysis ON ai_metric_analysis_items(analysis_id);
CREATE INDEX idx_ai_metric_analysis_items_metric_signal ON ai_metric_analysis_items(metric_code, signal);

CREATE TABLE ai_analysis_evidences (
    evidence_id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    analysis_id         BIGINT NOT NULL REFERENCES ai_analysis_runs(analysis_id) ON DELETE CASCADE,
    evidence_type       evidence_type NOT NULL,
    reference_table     VARCHAR(100),
    reference_id        VARCHAR(120),
    evidence_text       TEXT,
    importance_score    NUMERIC(6,2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_ai_analysis_evidences_importance CHECK (
        importance_score IS NULL OR importance_score BETWEEN 0 AND 100
    )
);

COMMENT ON TABLE ai_analysis_evidences IS 'AI 분석 근거 추적. 어떤 지표/뉴스/공시/파일을 근거로 판단했는지 저장.';

CREATE INDEX idx_ai_analysis_evidences_analysis ON ai_analysis_evidences(analysis_id);
CREATE INDEX idx_ai_analysis_evidences_reference ON ai_analysis_evidences(reference_table, reference_id);

-- ============================================================================
-- 11. NEWS DOMAIN
-- ============================================================================

CREATE TABLE news_articles (
    news_id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    external_news_id    VARCHAR(120),
    title               VARCHAR(500) NOT NULL,
    summary             TEXT,
    content_url         TEXT NOT NULL,
    publisher           VARCHAR(120),
    published_at        TIMESTAMPTZ,
    source_provider     VARCHAR(50) NOT NULL,
    content_hash        VARCHAR(128),
    raw_cache_file_id   BIGINT REFERENCES external_data_cache_files(cache_file_id) ON DELETE SET NULL,
    fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_news_articles_url UNIQUE (content_url),
    CONSTRAINT uq_news_articles_content_hash UNIQUE (content_hash)
);

COMMENT ON TABLE news_articles IS '뉴스 제목/요약/URL 캐시. 원문 전문은 DB에 넣지 말고 raw_cache_file_id로 로컬 파일 참조.';

CREATE INDEX idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX idx_news_articles_provider_external ON news_articles(source_provider, external_news_id);

CREATE TABLE stock_news (
    stock_news_id       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stock_id            BIGINT NOT NULL REFERENCES stocks(stock_id) ON DELETE CASCADE,
    news_id             BIGINT NOT NULL REFERENCES news_articles(news_id) ON DELETE CASCADE,
    relevance_score     NUMERIC(6,2),
    matched_keywords    TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_stock_news_stock_news UNIQUE (stock_id, news_id),
    CONSTRAINT chk_stock_news_relevance CHECK (relevance_score IS NULL OR relevance_score BETWEEN 0 AND 100)
);

COMMENT ON TABLE stock_news IS '종목과 뉴스의 N:M 연결. 기사 하나가 여러 종목에 연결될 수 있음.';

CREATE INDEX idx_stock_news_stock ON stock_news(stock_id, created_at DESC);
CREATE INDEX idx_stock_news_news ON stock_news(news_id);

CREATE TABLE news_ai_analyses (
    news_analysis_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    stock_news_id       BIGINT NOT NULL REFERENCES stock_news(stock_news_id) ON DELETE CASCADE,
    sentiment           sentiment_type NOT NULL DEFAULT 'neutral',
    impact_signal       signal_level_type NOT NULL DEFAULT 'gray',
    impact_term         impact_term_type NOT NULL DEFAULT 'unknown',
    impact_summary      TEXT,
    reason_text         TEXT,
    risk_keywords       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    model_name          VARCHAR(100),
    prompt_version      VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_news_ai_analyses_stock_news_prompt UNIQUE (stock_news_id, prompt_version)
);

COMMENT ON TABLE news_ai_analyses IS '뉴스가 종목에 긍정/부정/중립인지와 단기/중기/장기 영향을 AI가 해석한 결과.';

CREATE INDEX idx_news_ai_analyses_stock_news ON news_ai_analyses(stock_news_id);
CREATE INDEX idx_news_ai_analyses_signal ON news_ai_analyses(impact_signal, sentiment);

-- ============================================================================
-- 12. AI CHAT DOMAIN
-- ============================================================================

CREATE TABLE ai_chat_sessions (
    chat_session_id     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    stock_id            BIGINT REFERENCES stocks(stock_id) ON DELETE SET NULL,
    setting_id          BIGINT REFERENCES user_analysis_settings(setting_id) ON DELETE SET NULL,
    title               VARCHAR(200),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ai_chat_sessions IS '종목별 또는 일반 AI 질문 세션.';

CREATE INDEX idx_ai_chat_sessions_user_time ON ai_chat_sessions(user_id, updated_at DESC);
CREATE INDEX idx_ai_chat_sessions_stock ON ai_chat_sessions(stock_id);

CREATE TRIGGER trg_ai_chat_sessions_set_updated_at
BEFORE UPDATE ON ai_chat_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE ai_chat_messages (
    message_id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    chat_session_id         BIGINT NOT NULL REFERENCES ai_chat_sessions(chat_session_id) ON DELETE CASCADE,
    role                    chat_role_type NOT NULL,
    message_text            TEXT NOT NULL,
    related_analysis_id     BIGINT REFERENCES ai_analysis_runs(analysis_id) ON DELETE SET NULL,
    token_count             INTEGER,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_ai_chat_messages_token_count CHECK (token_count IS NULL OR token_count >= 0)
);

COMMENT ON TABLE ai_chat_messages IS '사용자 질문과 AI 답변 메시지.';

CREATE INDEX idx_ai_chat_messages_session_time ON ai_chat_messages(chat_session_id, created_at ASC);
CREATE INDEX idx_ai_chat_messages_related_analysis ON ai_chat_messages(related_analysis_id);

-- ============================================================================
-- 13. EXTERNAL API FETCH LOG DOMAIN
-- ============================================================================

CREATE TABLE external_api_fetch_logs (
    fetch_log_id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provider                VARCHAR(50) NOT NULL,
    target_type             VARCHAR(80) NOT NULL,
    target_id               VARCHAR(120),
    stock_id                BIGINT REFERENCES stocks(stock_id) ON DELETE SET NULL,
    request_hash            VARCHAR(128),
    request_summary         TEXT,
    status                  fetch_status_type NOT NULL,
    http_status_code        INTEGER,
    error_message           TEXT,
    response_cache_file_id  BIGINT REFERENCES external_data_cache_files(cache_file_id) ON DELETE SET NULL,
    fetched_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at              TIMESTAMPTZ,

    CONSTRAINT chk_external_api_fetch_logs_http_status CHECK (
        http_status_code IS NULL OR http_status_code BETWEEN 100 AND 599
    )
);

COMMENT ON TABLE external_api_fetch_logs IS 'DART, 증권 데이터, 뉴스, LLM API 호출 로그. 오류 추적과 캐시 재사용 판단에 사용.';

CREATE INDEX idx_external_api_fetch_logs_provider_time ON external_api_fetch_logs(provider, fetched_at DESC);
CREATE INDEX idx_external_api_fetch_logs_target ON external_api_fetch_logs(target_type, target_id, fetched_at DESC);
CREATE INDEX idx_external_api_fetch_logs_stock ON external_api_fetch_logs(stock_id, fetched_at DESC);
CREATE INDEX idx_external_api_fetch_logs_request_hash ON external_api_fetch_logs(request_hash);
CREATE INDEX idx_external_api_fetch_logs_expires ON external_api_fetch_logs(expires_at);

-- ============================================================================
-- 14. USEFUL VIEWS
-- ============================================================================

CREATE VIEW latest_ai_analysis_per_stock AS
SELECT DISTINCT ON (aar.stock_id, aar.analysis_type)
    aar.analysis_id,
    aar.stock_id,
    s.stock_code,
    s.company_name_ko,
    aar.analysis_type,
    aar.overall_signal,
    aar.overall_score,
    aar.summary_text,
    aar.reason_text,
    aar.caution_text,
    aar.source_period,
    aar.created_at,
    aar.expires_at
FROM ai_analysis_runs aar
JOIN stocks s ON s.stock_id = aar.stock_id
ORDER BY aar.stock_id, aar.analysis_type, aar.created_at DESC;

COMMENT ON VIEW latest_ai_analysis_per_stock IS '종목별/분석유형별 최신 AI 분석 결과 조회용 뷰.';

CREATE VIEW favorite_stocks_with_latest_analysis AS
SELECT
    fs.favorite_id,
    fs.user_id,
    fs.stock_id,
    s.stock_code,
    s.company_name_ko,
    s.market,
    fs.memo,
    fs.display_order,
    fs.created_at AS favorited_at,
    la.analysis_id,
    la.analysis_type,
    la.overall_signal,
    la.overall_score,
    la.summary_text,
    la.created_at AS analyzed_at
FROM favorite_stocks fs
JOIN stocks s ON s.stock_id = fs.stock_id
LEFT JOIN LATERAL (
    SELECT
        aar.analysis_id,
        aar.analysis_type,
        aar.overall_signal,
        aar.overall_score,
        aar.summary_text,
        aar.created_at
    FROM ai_analysis_runs aar
    WHERE aar.stock_id = fs.stock_id
      AND aar.analysis_type IN ('financial', 'combined')
    ORDER BY aar.created_at DESC
    LIMIT 1
) la ON TRUE;

COMMENT ON VIEW favorite_stocks_with_latest_analysis IS '관심종목 화면에서 최신 신호등 결과를 함께 보여주기 위한 뷰.';

-- ============================================================================
-- End of schema
-- ============================================================================
