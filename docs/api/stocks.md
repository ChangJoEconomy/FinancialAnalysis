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
