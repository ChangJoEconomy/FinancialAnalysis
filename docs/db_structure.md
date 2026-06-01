# AI 주식 분석 서비스 DB 구조 및 500MB 용량 검토

## 0. 문서 목적

이 문서는 AI 주식 분석 서비스의 데이터 저장 구조를 정리한 문서이다.
목표는 다음 3가지다.

1. 프로젝트 DB 용량이 500MB일 때 현재 기획에 문제가 없는지 검토한다.
2. 대용량 주식 데이터 캐싱을 DB에 넣을지, 서버 로컬 파일로 분리할지 판단한다.
3. 사람과 AI가 모두 이해하기 쉬운 형태로 최종 DB 구조를 정리한다.

---

## 1. 서비스 데이터 요구사항 요약

기획서 기준으로 서비스는 초보 투자자에게 복잡한 주식 정보를 쉽게 해석해주는 AI 투자 보조 서비스이다.
AI는 매수/매도 결정을 대신하는 것이 아니라 재무제표, 주요 지표, 뉴스, 사용자 질문을 초록/주황/빨강 신호와 쉬운 문장으로 번역한다.

필요한 주요 데이터는 다음과 같다.

| 구분 | 필요한 데이터 |
|---|---|
| 사용자 | 로그인 정보, 관심종목, 검색 기록, 분석 설정 |
| 종목 | 종목코드, 종목명, 시장, 업종, DART 기업 코드 |
| 주가 | 일별 OHLCV, 등락률, 차트 표시 데이터 |
| 재무 | 재무제표 주요 항목, PER, ROE, 부채비율, 영업이익률 등 |
| AI 분석 | 종합 신호등, 지표별 신호등, 판단 이유, 분석 기준 시점 |
| 뉴스 | 뉴스 제목, 요약, URL, 종목 관련도, 호재/악재/중립 분석 |
| AI 질문 | 사용자 질문, AI 답변, 참조한 종목과 분석 결과 |
| 캐시 관리 | 외부 API 응답 캐시, 로컬 파일 경로, 만료 시간, 갱신 로그 |

---

## 2. 500MB DB 용량 검토 결론

### 2.1 최종 판단

**500MB DB만으로 모든 데이터를 저장하는 구조는 위험하다.**
특히 전체 종목의 장기간 일별 주가 데이터, 뉴스 원문, 외부 API 원본 응답을 모두 DB에 저장하면 500MB를 빠르게 초과할 수 있다.

하지만 아래 원칙을 지키면 **500MB DB로도 프로젝트 구현에는 문제가 없다고 판단한다.**

1. DB에는 자주 조회하는 메타데이터, 사용자 데이터, 주요 재무 지표, AI 분석 결과만 저장한다.
2. 대용량 주가 데이터 원본은 서버 컴퓨터의 로컬 파일 캐시로 저장한다.
3. DB에는 로컬 파일의 경로, 데이터 기간, 행 개수, 해시값, 만료 시간만 저장한다.
4. 주가 데이터는 전체 원본을 DB에 넣지 않고, 최근 30일 또는 90일 정도의 요약 데이터만 DB에 선택적으로 저장한다.
5. 재무제표는 원본 전체보다 주요 항목과 계산된 지표 중심으로 DB에 저장한다.
6. 뉴스는 제목, URL, 요약, AI 분석 결과만 DB에 저장하고 원문 전문은 가능하면 저장하지 않는다.

따라서 이 프로젝트의 권장 구조는 **DB + 서버 로컬 파일 캐시의 하이브리드 구조**이다.

---

## 3. 왜 순수 DB 저장이 위험한가

### 3.1 주가 데이터가 가장 큰 문제

전체 국내 종목을 대상으로 일별 주가를 여러 년치 저장하면 행 수가 빠르게 커진다.

대략적인 계산은 다음과 같다.

| 범위 | 계산 예시 | 예상 행 수 | 판단 |
|---|---:|---:|---|
| 관심종목 100개, 5년 | 100개 × 250거래일 × 5년 | 약 125,000행 | DB 저장 가능 |
| 전체 종목 2,500개, 1년 | 2,500개 × 250거래일 | 약 625,000행 | 가능하지만 인덱스 포함 시 부담 시작 |
| 전체 종목 2,500개, 5년 | 2,500개 × 250거래일 × 5년 | 약 3,125,000행 | 500MB DB에서는 위험 |
| 전체 종목 3,000개, 10년 | 3,000개 × 250거래일 × 10년 | 약 7,500,000행 | DB 저장 비추천 |

일별 주가 1행은 숫자 몇 개뿐이라 작아 보이지만, 실제 DB에서는 다음 비용이 추가된다.

- row overhead
- primary key
- stock_id + trade_date 인덱스
- created_at, source_provider 등 관리 컬럼
- DB 페이지 단위 저장 공간
- vacuum, 통계, 임시 처리 공간

그래서 단순 CSV 크기보다 DB 실제 사용량이 더 커질 수 있다.

### 3.2 뉴스 원문도 DB에 넣으면 비효율적이다

뉴스 분석 기능은 MVP 이후 확장 기능이지만, 원문 전문까지 저장하면 용량이 빠르게 늘어난다.
DB에는 다음 정도만 저장하는 것이 적절하다.

- 제목
- URL
- 언론사
- 발행일
- 짧은 요약
- 종목 관련도
- AI가 판단한 호재/악재/중립 결과

기사 원문 전문은 저작권과 용량 측면에서 저장하지 않는 편이 안전하다.
필요하다면 원문 스냅샷 대신 API 응답 요약만 저장한다.

### 3.3 재무 데이터는 DB에 저장해도 괜찮다

재무 데이터는 주가 데이터보다 업데이트 빈도가 낮다.
분기/연간 단위로 갱신되므로 주요 재무 항목과 계산된 지표는 DB에 저장해도 된다.

다만 모든 원본 재무제표 라인아이템을 무제한 저장하는 것보다는 다음 방식이 좋다.

- DB: 주요 항목과 계산된 지표 저장
- 로컬 파일: DART 원본 응답 JSON/XML/XLSX 저장
- DB: 로컬 원본 파일 경로와 해시 저장

---

## 4. 권장 저장 전략

## 4.1 저장 위치 결정 기준

| 데이터 | DB 저장 | 로컬 파일 저장 | 이유 |
|---|---:|---:|---|
| 사용자 계정 | 예 | 아니오 | 용량 작고 조회 빈도 높음 |
| 분석 설정 | 예 | 아니오 | 사용자별 설정 관리 필요 |
| 관심종목 | 예 | 아니오 | 관계형 조회 필요 |
| 검색 기록 | 예 | 아니오 | 최근 본 종목, 인기 검색어 집계 필요 |
| 종목 마스터 | 예 | 선택 | 검색과 JOIN에 필요 |
| 최근 주가 30~90일 | 선택 | 예 | 화면 빠른 표시용으로만 DB 가능 |
| 장기간 일별 주가 | 아니오 | 예 | 대용량 시계열 데이터 |
| DART 원본 응답 | 아니오 | 예 | 원본은 크고 재처리용 |
| 주요 재무 항목 | 예 | 선택 | AI 분석과 화면 표시 핵심 |
| 계산된 재무 지표 | 예 | 아니오 | PER, ROE, 부채비율 등 핵심 데이터 |
| 업종 평균 지표 | 예 | 아니오 | 비교 분석에 필요 |
| AI 분석 결과 | 예 | 아니오 | 화면 재사용과 캐싱에 필요 |
| AI 지표별 판단 | 예 | 아니오 | 설명 가능성 확보 |
| 뉴스 제목/요약/URL | 예 | 아니오 | 화면 목록과 분석에 필요 |
| 뉴스 원문 전문 | 아니오 | 선택 | 용량/저작권 이슈 |
| AI 채팅 메시지 | 예 | 아니오 | 사용자 경험과 기록 관리 |
| 외부 API 호출 로그 | 예 | 아니오 | 장애 추적, 캐시 만료 관리 |

---

## 4.2 하이브리드 캐시 구조

```text
[Application Server]
        |
        |-- DB 500MB
        |     |-- 사용자 데이터
        |     |-- 종목 마스터
        |     |-- 주요 재무 지표
        |     |-- AI 분석 결과
        |     |-- 로컬 캐시 파일 인덱스
        |
        |-- Local File Cache
              |-- price_daily/
              |     |-- stock_code=005930.parquet
              |     |-- stock_code=000660.parquet
              |
              |-- dart_raw/
              |     |-- corp_code=00126380/year=2024/report=11011.json.gz
              |
              |-- news_raw/
              |     |-- stock_code=005930/date=2026-05-18.jsonl.gz
              |
              |-- ai_prompt_logs/
                    |-- optional_debug_only.jsonl.gz
```

---

## 4.3 로컬 파일 저장 포맷 추천

| 데이터 | 추천 포맷 | 이유 |
|---|---|---|
| 장기간 일별 주가 | Parquet | 압축률 좋고 컬럼 조회에 유리 |
| DART 원본 응답 | JSON.gz 또는 XML.gz | 원본 보존과 재처리에 유리 |
| 뉴스 API 응답 | JSONL.gz | 여러 기사 append 저장에 유리 |
| AI 디버그 로그 | JSONL.gz | 요청/응답 로그 저장에 유리 |
| 임시 차트 데이터 | CSV 가능 | 구현이 가장 쉬움 |

학기 프로젝트에서는 구현 난이도를 고려하면 다음 순서를 추천한다.

1. 처음에는 CSV 또는 JSON 파일로 로컬 캐시 구현
2. 구조가 안정되면 Parquet/gzip으로 변경
3. DB에는 반드시 파일 경로와 캐시 메타데이터 저장

---

## 5. 최종 DB 구조 개요

```text
users
 ├─ user_analysis_settings
 ├─ stock_search_histories
 ├─ favorite_stocks
 └─ ai_chat_sessions
        └─ ai_chat_messages

stocks
 ├─ stock_aliases
 ├─ stock_price_recent_daily             # 선택: 최근 30~90일만 DB 저장
 ├─ local_cache_files                    # 장기 주가/원본 응답 파일 인덱스
 ├─ financial_statement_snapshots
 │      └─ financial_line_items
 ├─ financial_metric_values
 ├─ ai_analysis_runs
 │      ├─ ai_metric_analysis_items
 │      └─ ai_analysis_evidences
 └─ stock_news
        ├─ news_articles
        └─ news_ai_analyses

metric_definitions
 ├─ financial_metric_values
 └─ ai_metric_analysis_items

industry_metric_benchmarks
```

---

# 6. 테이블 상세 구조

## 6.1 사용자 영역

### users

회원 정보를 저장한다.

| 컬럼 | 설명 |
|---|---|
| user_id | 사용자 고유 ID |
| email | 로그인 이메일 |
| password_hash | 비밀번호 해시값 |
| nickname | 닉네임 |
| login_provider | local, google, kakao 등 |
| status | active, withdrawn, blocked |
| created_at | 가입일 |
| last_login_at | 마지막 로그인 일시 |

---

### user_analysis_settings

사용자가 선택한 분석 성향을 저장한다.
예: 보수적으로 분석하기, 성장성을 더 중요하게 보기.

| 컬럼 | 설명 |
|---|---|
| setting_id | 설정 ID |
| user_id | 사용자 ID |
| setting_name | 설정 이름 |
| risk_type | conservative, balanced, growth |
| stability_weight | 재무 안정성 가중치 |
| growth_weight | 성장성 가중치 |
| profitability_weight | 수익성 가중치 |
| valuation_weight | 밸류에이션 가중치 |
| news_weight | 뉴스 영향 가중치 |
| is_default | 기본 설정 여부 |
| created_at | 생성일 |
| updated_at | 수정일 |

---

## 6.2 종목 기본 정보 영역

### stocks

종목의 기본 정보를 저장한다.

| 컬럼 | 설명 |
|---|---|
| stock_id | 내부 종목 ID |
| stock_code | 종목 코드, 예: 005930 |
| ticker | 거래소 표기 코드, 예: 005930.KS |
| company_name_ko | 한글 기업명 |
| company_name_en | 영문 기업명 |
| market | KOSPI, KOSDAQ, KONEX |
| dart_corp_code | DART 기업 고유 코드 |
| industry_code | 업종 코드 |
| industry_name | 업종명 |
| listed_at | 상장일 |
| is_active | 상장 유지 여부 |
| created_at | 생성일 |
| updated_at | 수정일 |

---

### stock_aliases

종목 검색을 쉽게 하기 위한 별칭 테이블이다.

| 컬럼 | 설명 |
|---|---|
| alias_id | 별칭 ID |
| stock_id | 종목 ID |
| alias_name | 검색 별칭 |
| alias_type | company_name, short_name, keyword, code |

예시:

| 종목 | 별칭 |
|---|---|
| 삼성전자 | 삼성전자 |
| 삼성전자 | 삼전 |
| 삼성전자 | 005930 |
| 삼성전자 | Samsung Electronics |

---

## 6.3 사용자 행동 영역

### stock_search_histories

사용자가 검색한 종목 기록을 저장한다.
최근 본 종목과 인기 검색 종목 집계에 사용한다.

| 컬럼 | 설명 |
|---|---|
| search_id | 검색 기록 ID |
| user_id | 사용자 ID, 비로그인 허용 시 null 가능 |
| query_text | 사용자가 입력한 검색어 |
| stock_id | 선택된 종목 ID |
| result_count | 검색 결과 수 |
| searched_at | 검색 일시 |

---

### favorite_stocks

사용자의 관심종목을 저장한다.

| 컬럼 | 설명 |
|---|---|
| favorite_id | 관심종목 ID |
| user_id | 사용자 ID |
| stock_id | 종목 ID |
| memo | 사용자 메모 |
| display_order | 관심종목 정렬 순서 |
| created_at | 추가일 |

---

## 6.4 주가 데이터 영역

### stock_price_recent_daily

최근 차트 표시용으로만 사용하는 선택 테이블이다.
500MB 제한이 있으므로 전체 장기 주가를 이 테이블에 넣지 않는다.
최근 30일 또는 90일만 저장하는 것을 권장한다.

| 컬럼 | 설명 |
|---|---|
| price_id | 주가 데이터 ID |
| stock_id | 종목 ID |
| trade_date | 거래일 |
| open_price | 시가 |
| high_price | 고가 |
| low_price | 저가 |
| close_price | 종가 |
| volume | 거래량 |
| change_amount | 전일 대비 금액 |
| change_rate | 등락률 |
| source_provider | 증권 데이터 API 제공처 |
| fetched_at | 수집 시각 |

운영 정책:

- DB 저장 기간: 최근 30일 또는 90일
- 장기 데이터: local_cache_files가 가리키는 로컬 Parquet/CSV 파일 사용
- 차트 요청 시:
  - 1개월/3개월 차트는 DB에서 조회 가능
  - 1년/3년/5년 차트는 로컬 파일에서 읽기

---

### local_cache_files

DB에 넣기 어려운 대용량 캐시 파일의 위치와 상태를 저장한다.
이 테이블이 하이브리드 구조의 핵심이다.

| 컬럼 | 설명 |
|---|---|
| cache_file_id | 캐시 파일 ID |
| cache_type | price_daily, dart_raw, news_raw, ai_log 등 |
| stock_id | 관련 종목 ID, 전체 시장 파일이면 null 가능 |
| provider | DART, STOCK_API, NEWS_API, LLM 등 |
| file_path | 서버 로컬 파일 경로 |
| file_format | parquet, csv, json, jsonl, xml, gz 등 |
| range_start_date | 데이터 시작일 |
| range_end_date | 데이터 종료일 |
| row_count | 파일 내 데이터 행 수 |
| file_size_bytes | 파일 크기 |
| content_hash | 중복/변경 확인용 해시 |
| status | active, expired, corrupted, deleted |
| fetched_at | 수집 시각 |
| expires_at | 캐시 만료 시각 |

예시:

| cache_type | stock_id | file_path | range |
|---|---:|---|---|
| price_daily | 삼성전자 | /data/cache/price_daily/005930.parquet | 2020-01-01 ~ 2026-05-18 |
| dart_raw | 삼성전자 | /data/cache/dart_raw/00126380/2024_11011.json.gz | 2024 사업보고서 |
| news_raw | 삼성전자 | /data/cache/news_raw/005930/2026-05-18.jsonl.gz | 2026-05-18 뉴스 |

---

## 6.5 재무제표 영역

### financial_statement_snapshots

DART API 등에서 가져온 재무제표의 기준 정보를 저장한다.
원본 전체는 로컬 파일에 저장하고, 이 테이블에는 기준 정보와 원본 파일 참조를 둔다.

| 컬럼 | 설명 |
|---|---|
| statement_id | 재무제표 스냅샷 ID |
| stock_id | 종목 ID |
| fiscal_year | 사업연도 |
| quarter | 분기, 1Q/2Q/3Q/4Q/Annual |
| period_type | annual, quarterly |
| statement_type | balance_sheet, income_statement, cash_flow |
| currency | KRW 등 |
| report_name | 사업보고서, 반기보고서 등 |
| dart_report_no | DART 보고서 번호 |
| source_provider | DART |
| raw_cache_file_id | 원본 파일 캐시 ID |
| fetched_at | 수집일 |
| data_version | 데이터 버전 |

---

### financial_line_items

재무제표 주요 항목을 저장한다.
500MB 제한을 고려해 모든 원본 라인아이템을 무제한 저장하지 말고, 서비스에서 쓰는 주요 항목 중심으로 저장한다.

| 컬럼 | 설명 |
|---|---|
| line_item_id | 재무 항목 ID |
| statement_id | 재무제표 스냅샷 ID |
| account_code | 계정 코드 |
| account_name | 계정명 |
| amount | 금액 |
| unit | 원, 천원, 백만원 등 |
| display_order | 표시 순서 |

주요 저장 항목 예시:

| account_name | 용도 |
|---|---|
| 매출액 | 성장성 분석 |
| 영업이익 | 수익성 분석 |
| 당기순이익 | 수익성 분석 |
| 자산총계 | 안정성 분석 |
| 부채총계 | 부채비율 계산 |
| 자본총계 | ROE 계산 |
| 현금및현금성자산 | 유동성 분석 |
| 영업활동현금흐름 | 이익의 질 분석 |

---

## 6.6 주요 재무 지표 영역

### metric_definitions

PER, ROE, 부채비율 같은 지표의 정의와 초보자용 설명을 저장한다.

| 컬럼 | 설명 |
|---|---|
| metric_code | 지표 코드, 예: PER, ROE |
| metric_name_ko | 한글 지표명 |
| metric_name_en | 영문 지표명 |
| description_beginner | 초보자용 설명 |
| formula_text | 계산식 설명 |
| unit | %, 배, 원 등 |
| good_direction | higher_better, lower_better, range_better |
| category | stability, growth, profitability, valuation |
| display_order | 화면 표시 순서 |

주요 지표 예시:

| metric_code | 지표명 | category |
|---|---|---|
| PER | 주가수익비율 | valuation |
| PBR | 주가순자산비율 | valuation |
| ROE | 자기자본이익률 | profitability |
| DEBT_RATIO | 부채비율 | stability |
| OPERATING_MARGIN | 영업이익률 | profitability |
| REVENUE_GROWTH | 매출 성장률 | growth |
| OPERATING_PROFIT_GROWTH | 영업이익 성장률 | growth |
| CASH_RATIO | 현금성 자산 비율 | stability |

---

### financial_metric_values

종목별 주요 지표 값을 저장한다.
이 테이블은 AI 분석과 화면 표시에서 가장 중요하다.

| 컬럼 | 설명 |
|---|---|
| metric_value_id | 지표값 ID |
| stock_id | 종목 ID |
| metric_code | 지표 코드 |
| fiscal_year | 사업연도 |
| quarter | 분기 |
| period_type | annual, quarterly, ttm |
| metric_value | 지표 값 |
| unit | %, 배, 원 등 |
| industry_avg_value | 업종 평균값 |
| previous_value | 이전 기간 값 |
| change_rate | 이전 기간 대비 변화율 |
| source_statement_id | 계산에 사용한 재무제표 ID |
| calculated_at | 계산일 |

---

### industry_metric_benchmarks

업종 평균과 중앙값을 저장한다.
AI가 업종 평균 대비 좋은지 나쁜지 판단할 때 사용한다.

| 컬럼 | 설명 |
|---|---|
| benchmark_id | 벤치마크 ID |
| industry_code | 업종 코드 |
| industry_name | 업종명 |
| metric_code | 지표 코드 |
| fiscal_year | 사업연도 |
| quarter | 분기 |
| avg_value | 업종 평균 |
| median_value | 업종 중앙값 |
| sample_count | 계산에 포함된 종목 수 |
| source_provider | 데이터 출처 |
| calculated_at | 계산일 |

---

## 6.7 AI 분석 영역

### ai_analysis_runs

종목 하나에 대한 AI 분석 실행 결과를 저장한다.
요약분석 화면의 전체 신호등, 한 줄 요약, 핵심 이유에 사용한다.

| 컬럼 | 설명 |
|---|---|
| analysis_id | AI 분석 ID |
| user_id | 사용자 ID, 비로그인 분석이면 null 가능 |
| stock_id | 종목 ID |
| setting_id | 사용한 분석 설정 ID |
| analysis_type | financial, news, summary, combined |
| overall_signal | green, orange, red |
| overall_score | 내부 점수 |
| summary_text | 초보자용 요약 문장 |
| reason_text | 왜 이 신호가 나왔는지 설명 |
| caution_text | 주의할 점 |
| source_period | 분석 기준 기간 |
| source_data_hash | 사용 데이터 식별값 |
| model_name | 사용한 LLM 모델명 |
| prompt_version | 프롬프트 버전 |
| created_at | 분석 생성일 |
| expires_at | 캐시 만료일 |

운영 정책:

- 같은 종목, 같은 분석 설정, 같은 데이터 기준이면 기존 분석 결과를 재사용한다.
- 재무 데이터가 바뀌거나 뉴스가 바뀌면 source_data_hash를 바꿔 재분석한다.
- 매수/매도 추천 컬럼은 두지 않는다.

---

### ai_metric_analysis_items

PER, ROE, 부채비율 등 개별 지표마다 AI가 판단한 결과를 저장한다.

| 컬럼 | 설명 |
|---|---|
| item_id | 지표 분석 ID |
| analysis_id | AI 분석 ID |
| metric_code | 지표 코드 |
| metric_value | 실제 지표값 |
| industry_avg_value | 업종 평균 |
| previous_value | 이전 기간 값 |
| signal | green, orange, red |
| score | 내부 점수 |
| reason_text | 판단 이유 |
| beginner_explanation | 초보자용 쉬운 설명 |
| check_point_text | 사용자가 추가로 확인할 점 |

---

### ai_analysis_evidences

AI 분석이 어떤 데이터에 근거했는지 저장한다.
AI 답변의 설명 가능성을 높이는 테이블이다.

| 컬럼 | 설명 |
|---|---|
| evidence_id | 근거 ID |
| analysis_id | AI 분석 ID |
| evidence_type | financial_metric, news_article, disclosure, price |
| reference_id | 참조 데이터 ID |
| evidence_text | 근거 요약 |
| importance_score | 중요도 |
| created_at | 생성일 |

---

## 6.8 뉴스 영역

### news_articles

뉴스 API 또는 RSS에서 가져온 기사 메타데이터를 저장한다.
원문 전문은 저장하지 않는 것을 기본 정책으로 한다.

| 컬럼 | 설명 |
|---|---|
| news_id | 뉴스 ID |
| external_news_id | 외부 API 뉴스 ID |
| title | 기사 제목 |
| summary | 기사 요약 |
| content_url | 기사 URL |
| publisher | 언론사 |
| published_at | 발행일 |
| source_provider | 뉴스 API, RSS 등 |
| content_hash | 중복 기사 판별용 해시 |
| raw_cache_file_id | 원본 응답 파일 캐시 ID, 선택 |
| fetched_at | 수집일 |

---

### stock_news

뉴스와 종목의 연결 테이블이다.
기사 하나가 여러 기업과 관련될 수 있으므로 N:M 구조로 분리한다.

| 컬럼 | 설명 |
|---|---|
| stock_news_id | 종목-뉴스 연결 ID |
| stock_id | 종목 ID |
| news_id | 뉴스 ID |
| relevance_score | 해당 종목과의 관련도 |
| matched_keywords | 매칭된 키워드 |
| created_at | 연결 생성일 |

---

### news_ai_analyses

뉴스가 해당 기업에 좋은 뉴스인지, 위험한 뉴스인지 AI가 분석한 결과를 저장한다.

| 컬럼 | 설명 |
|---|---|
| news_analysis_id | 뉴스 분석 ID |
| stock_news_id | 종목-뉴스 연결 ID |
| sentiment | positive, negative, neutral |
| impact_signal | green, orange, red |
| impact_term | short_term, mid_term, long_term |
| impact_summary | 영향 요약 |
| reason_text | 판단 이유 |
| risk_keywords | 리스크 키워드 |
| model_name | 사용 모델 |
| prompt_version | 프롬프트 버전 |
| created_at | 분석일 |

---

## 6.9 AI 질문 영역

### ai_chat_sessions

사용자가 특정 종목에 대해 AI에게 질문하는 대화 단위를 저장한다.

| 컬럼 | 설명 |
|---|---|
| chat_session_id | 채팅 세션 ID |
| user_id | 사용자 ID |
| stock_id | 관련 종목 ID |
| setting_id | 적용된 분석 설정 |
| title | 대화 제목 |
| created_at | 생성일 |
| updated_at | 마지막 수정일 |

---

### ai_chat_messages

사용자 질문과 AI 답변을 저장한다.

| 컬럼 | 설명 |
|---|---|
| message_id | 메시지 ID |
| chat_session_id | 채팅 세션 ID |
| role | user, assistant, system |
| message_text | 메시지 내용 |
| related_analysis_id | 참조한 AI 분석 ID |
| token_count | 사용 토큰 수 |
| created_at | 메시지 생성일 |

---

## 6.10 외부 API 및 캐시 관리 영역

### external_api_fetch_logs

DART, 증권 데이터 API, 뉴스 API, LLM API 호출 기록을 저장한다.
캐싱, 오류 추적, 재수집 여부 판단에 필요하다.

| 컬럼 | 설명 |
|---|---|
| fetch_log_id | API 호출 로그 ID |
| provider | DART, STOCK_API, NEWS_API, LLM |
| target_type | stock, financial_statement, price, news, analysis |
| target_id | 대상 ID |
| request_hash | 요청 파라미터 해시 |
| response_cache_file_id | 원본 응답 파일 캐시 ID |
| status | success, failed, skipped |
| error_message | 실패 사유 |
| fetched_at | 호출 시각 |
| expires_at | 캐시 만료 시각 |

---

# 7. MVP 기준 필수 테이블

500MB 제한을 고려한 MVP 필수 테이블은 다음과 같다.

| 우선순위 | 테이블 | 이유 |
|---|---|---|
| 필수 | users | 로그인 기능 |
| 필수 | user_analysis_settings | 분석 성향 저장 |
| 필수 | stocks | 종목 검색 기본 |
| 필수 | stock_aliases | 종목명/별칭 검색 |
| 필수 | stock_search_histories | 최근 본 종목, 인기 검색어 |
| 필수 | favorite_stocks | 관심종목 저장 |
| 필수 | local_cache_files | 대용량 캐시 파일 인덱스 |
| 필수 | financial_statement_snapshots | 재무 데이터 기준 정보 |
| 필수 | financial_line_items | 주요 재무 항목 |
| 필수 | metric_definitions | 지표 설명 |
| 필수 | financial_metric_values | 주요 재무 지표값 |
| 필수 | ai_analysis_runs | AI 종합 분석 결과 |
| 필수 | ai_metric_analysis_items | 지표별 신호등 분석 |
| 권장 | external_api_fetch_logs | API 장애와 캐시 관리 |

---

# 8. 2차 확장 테이블

| 확장 테이블 | 이유 |
|---|---|
| stock_price_recent_daily | 최근 차트 빠른 조회 |
| industry_metric_benchmarks | 업종 평균 비교 |
| ai_analysis_evidences | AI 판단 근거 추적 |
| news_articles | 뉴스 목록 |
| stock_news | 뉴스-종목 연결 |
| news_ai_analyses | 뉴스 호재/악재 분석 |
| ai_chat_sessions | AI 질문 세션 |
| ai_chat_messages | AI 질문/답변 저장 |

---

# 9. 캐시 갱신 정책

## 9.1 주가 캐시

| 데이터 | 갱신 주기 | 저장 위치 |
|---|---|---|
| 오늘/최근 주가 | 사용자가 조회할 때 또는 하루 1회 | DB 최근 테이블 + 로컬 파일 |
| 1년 이상 일별 주가 | 최초 조회 시 수집 후 재사용 | 로컬 파일 |
| 장기 차트 데이터 | 필요 시 로컬 파일에서 읽어 가공 | 로컬 파일 |

권장 방식:

1. 사용자가 종목을 검색한다.
2. DB에서 해당 종목의 캐시 인덱스를 확인한다.
3. 로컬 파일이 있고 만료되지 않았으면 파일에서 차트 데이터를 읽는다.
4. 로컬 파일이 없거나 만료되었으면 키움증권 REST API를 호출한다.
5. 받은 데이터를 로컬 파일로 저장한다.
6. DB의 local_cache_files를 갱신한다.
7. 최근 30~90일 데이터만 stock_price_recent_daily에 선택 저장한다.

---

## 9.2 재무 캐시

| 데이터 | 갱신 주기 | 저장 위치 |
|---|---|---|
| DART 원본 응답 | 분기/연간 보고서 갱신 시 | 로컬 파일 |
| 주요 재무 항목 | 원본 수집 후 추출 | DB |
| 주요 재무 지표 | 항목 추출 후 계산 | DB |
| AI 재무 분석 | 지표 변경 시 재생성 | DB |

권장 방식:

1. 종목 검색 시 financial_metric_values에 최신 지표가 있는지 확인한다.
2. 없으면 DART API를 호출하거나 로컬 원본 파일을 확인한다.
3. 원본 응답은 로컬 파일로 저장한다.
4. DB에는 주요 항목과 계산된 지표만 저장한다.
5. AI 분석 결과는 ai_analysis_runs와 ai_metric_analysis_items에 저장한다.

---

## 9.3 뉴스 캐시

| 데이터 | 갱신 주기 | 저장 위치 |
|---|---|---|
| 최근 뉴스 메타데이터 | 하루 1회 또는 조회 시 | DB |
| 뉴스 API 원본 응답 | 선택 저장 | 로컬 파일 |
| 뉴스 AI 분석 결과 | 뉴스 수집 후 생성 | DB |

권장 방식:

- 뉴스 원문 전문은 DB에 저장하지 않는다.
- 제목, URL, 요약, 발행일, 언론사, AI 분석 결과만 DB에 저장한다.
- 같은 URL 또는 content_hash는 중복 저장하지 않는다.

---

# 10. 화면별 사용하는 테이블

## 10.1 HOME 화면

| 기능 | 사용하는 테이블 |
|---|---|
| 종목 검색 | stocks, stock_aliases |
| 최근 본 종목 | stock_search_histories |
| 인기 검색 종목 | stock_search_histories 집계 |
| 관심종목 바로가기 | favorite_stocks |

---

## 10.2 요약분석 화면

| 기능 | 사용하는 테이블 |
|---|---|
| 종목 기본 정보 | stocks |
| 현재가/등락률 | stock_price_recent_daily 또는 로컬 주가 캐시 |
| 주요 재무 지표 | financial_metric_values |
| 신호등 분석 | ai_analysis_runs, ai_metric_analysis_items |
| AI 질문 입력 | ai_chat_sessions, ai_chat_messages |

---

## 10.3 재무상세 화면

| 기능 | 사용하는 테이블 |
|---|---|
| PER, ROE, 부채비율 상세 | financial_metric_values |
| 지표 설명 | metric_definitions |
| 업종 평균 비교 | industry_metric_benchmarks |
| 지표별 AI 판단 이유 | ai_metric_analysis_items |
| 재무제표 주요 항목 | financial_statement_snapshots, financial_line_items |
| DART 원본 확인 | local_cache_files |

---

## 10.4 뉴스분석 화면

| 기능 | 사용하는 테이블 |
|---|---|
| 최근 뉴스 목록 | news_articles, stock_news |
| 호재/악재/중립 분류 | news_ai_analyses |
| 영향 설명 | news_ai_analyses |
| 원본 응답 재처리 | local_cache_files |

---

## 10.5 AI 질문 화면

| 기능 | 사용하는 테이블 |
|---|---|
| 질문 세션 | ai_chat_sessions |
| 사용자 질문 | ai_chat_messages |
| AI 답변 | ai_chat_messages |
| 기존 분석 참조 | ai_analysis_runs, ai_metric_analysis_items |

---

## 10.6 관심종목 화면

| 기능 | 사용하는 테이블 |
|---|---|
| 관심종목 목록 | favorite_stocks, stocks |
| 종목별 최근 신호 | ai_analysis_runs |
| 종목별 핵심 이유 | ai_analysis_runs |
| 정렬 순서 | favorite_stocks.display_order |

---

# 11. 용량 관리 규칙

500MB DB를 안정적으로 사용하기 위해 다음 규칙을 적용한다.

## 11.1 DB에 넣지 않을 것

- 전체 종목의 장기간 일별 주가 전체
- 분봉/틱 데이터
- 뉴스 기사 원문 전문
- DART 원본 XML/JSON 전체를 무제한 저장
- LLM 전체 프롬프트/응답 디버그 로그 전체
- 동일한 API 응답의 중복 저장

## 11.2 DB에 넣을 것

- 사용자 정보
- 관심종목
- 검색 기록
- 종목 마스터
- 주요 재무 항목
- 계산된 주요 지표
- AI 분석 결과
- AI 지표별 판단 이유
- 캐시 파일 경로와 만료 시간
- 외부 API 호출 성공/실패 로그

## 11.3 삭제 또는 보관 정책

| 데이터 | 보관 정책 |
|---|---|
| 검색 기록 | 최근 100개 또는 최근 6개월 |
| AI 채팅 메시지 | 사용자별 최근 N개 또는 6개월 |
| AI 분석 결과 | 최신 데이터 기준 결과만 유지, 오래된 결과는 삭제 또는 압축 |
| API 호출 로그 | 최근 30~90일 |
| 최근 주가 DB 테이블 | 최근 30~90일 |
| 로컬 주가 파일 | 오래된 파일도 유지 가능, 단 용량 초과 시 LRU 삭제 |
| 뉴스 데이터 | 최근 30~90일 중심 |

---

# 12. 최종 추천 구조

최종 추천은 다음과 같다.

```text
[DB에 저장]
users
user_analysis_settings
stocks
stock_aliases
stock_search_histories
favorite_stocks
local_cache_files
financial_statement_snapshots
financial_line_items
metric_definitions
financial_metric_values
industry_metric_benchmarks
ai_analysis_runs
ai_metric_analysis_items
ai_analysis_evidences
news_articles
stock_news
news_ai_analyses
ai_chat_sessions
ai_chat_messages
external_api_fetch_logs
stock_price_recent_daily      # 선택: 최근 30~90일만

[서버 로컬 파일에 저장]
장기간 일별 주가 파일
DART 원본 응답 파일
뉴스 API 원본 응답 파일
AI 디버그 로그 파일
차트 생성용 중간 파일
```

---

# 13. 한 줄 결론

**500MB DB는 사용자 수가 많지 않은 학기 프로젝트 기준으로 충분하지만, 대용량 주식 데이터 전체를 DB에 넣으면 위험하다. 따라서 DB는 분석 서비스의 메타데이터와 결과 저장소로 사용하고, 장기간 주가/원본 API 응답은 서버 로컬 파일 캐시로 분리하는 구조가 가장 안전하다.**
