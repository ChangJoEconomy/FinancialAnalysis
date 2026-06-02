# Stock API

## GET /api/stocks/search

종목명, 영문명, 종목코드, 티커, 별칭으로 종목을 검색한다.

문서 예시 호환을 위해 `/stocks/search`도 같은 응답을 반환한다.

요청:

```http
GET /api/stocks/search?q=삼성전자
```

검색 대상:

```text
stocks.company_name_ko
stocks.company_name_en
stocks.stock_code
stocks.ticker
stock_aliases.alias_name
```

응답:

```json
[
  {
    "stock_id": 1,
    "stock_code": "005930",
    "ticker": "005930.KS",
    "company_name_ko": "삼성전자",
    "company_name_en": "Samsung Electronics",
    "market": "KOSPI",
    "industry_name": "반도체 / 전자제품",
    "dart_corp_code": "00126380",
    "matched_field": "company_name_ko",
    "matched_value": "삼성전자"
  }
]
```

터미널에서 한글 검색을 확인할 때는 URL 인코딩을 위해 `--data-urlencode`를 사용한다.

```bash
curl -G 'http://127.0.0.1:4000/api/stocks/search' --data-urlencode 'q=삼성전자'
curl -G 'http://127.0.0.1:4000/api/stocks/search' --data-urlencode 'q=삼전'
curl 'http://127.0.0.1:4000/api/stocks/search?q=005930'
```

## POST /api/stocks/search-click

검색 결과에서 사용자가 종목을 클릭했을 때 검색 기록을 저장한다.

인증:

```http
Authorization: Bearer <accessToken>
```

요청:

```json
{
  "queryText": "삼성전자",
  "stockId": 1,
  "resultCount": 1
}
```

처리:

```text
요청 body의 user_id는 받지 않는다.
백엔드가 accessToken으로 현재 로그인 사용자를 확인한다.
stock_search_histories.user_id는 서버가 주입한다.
```

## GET /api/stocks/popular

최근 `stock_search_histories`를 집계해 인기 검색종목을 반환한다.

요청:

```http
GET /api/stocks/popular?limit=5
```

응답:

```json
[
  {
    "stock_id": 1,
    "stock_code": "005930",
    "ticker": "005930.KS",
    "company_name_ko": "삼성전자",
    "market": "KOSPI",
    "search_count": 3,
    "last_searched_at": "2026-05-18T10:00:00.000Z"
  }
]
```

## GET /api/stocks/:stockId

종목 기본 정보를 조회한다.

```http
GET /api/stocks/1
```

## GET /api/stocks/:stockId/summary

최신 Gemini 재무 설명, 신호등, 지표별 분석 근거를 조회한다.

로그인 토큰이 있으면 사용자의 기본 분석 설정 결과를 먼저 조회하고, 아직 개인화 분석 결과가 없으면 공개 기본 분석 결과를 반환한다.

```http
GET /api/stocks/1/summary
```

## POST /api/stocks/:stockId/analyze

종목 분석을 실행한다.

```http
POST /api/stocks/1/analyze
Content-Type: application/json

{
  "fiscalYear": 2024
}
```

처리 흐름:

```text
1. 최신 LLM 설명 캐시가 유효하면 cached=true로 즉시 반환한다.
2. 캐시가 없거나 forceRefresh=true이면 재무 지표를 준비한다.
3. 규칙 기반 신호등 분석을 실행한다.
4. Gemini 초보자용 설명을 생성한다.
5. 분석 run, 지표별 설명, 근거 데이터를 저장한다.
```

로그인 사용자는 본인 소유 `settingId`를 지정할 수 있다.

```json
{
  "fiscalYear": 2024,
  "settingId": 2,
  "forceRefresh": true
}
```

## GET /api/stocks/:stockId/financials

재무제표 스냅샷, 주요 계정 항목, 계산된 지표를 조회한다.

```http
GET /api/stocks/1/financials?fiscalYear=2024
```

## GET /api/stocks/:stockId/prices

요약분석 화면의 그래프에 사용하는 최근 일별 주가를 조회한다.

```http
GET /api/stocks/1/prices?days=30
```

키움증권 REST API 수집과 캐시 정책은 `docs/api/stock-prices.md`에 정리했다.

## GET /api/stocks/:stockId/news

저장된 최근 뉴스와 AI 영향 분석을 조회한다.

```http
GET /api/stocks/1/news?limit=5
```

## POST /api/stocks/:stockId/news/refresh

네이버 뉴스 검색 API에서 최신 뉴스를 수집하고 Gemini 영향 분석을 저장한다.

```http
POST /api/stocks/1/news/refresh
Content-Type: application/json

{
  "limit": 5,
  "forceRefresh": true
}
```

세부 흐름은 `docs/api/news.md`에 정리했다.
