# Stock Price API

키움증권 REST API의 일봉 데이터를 수집하고 요약분석 화면의 최근 종가 그래프에 사용한다.

## 환경변수

App Key와 App Secret은 프로젝트 루트 `.env`에만 저장한다. 시작 값은 `.env.example`을 참고한다.

```env
STOCK_APP_KEY=
STOCK_SECRET_KEY=
```

선택 설정:

```env
KIWOOM_API_BASE_URL=https://api.kiwoom.com
```

프론트엔드에는 키움 인증정보나 접근 토큰을 전달하지 않는다.

## 수집

공식 키움 REST API 흐름:

```text
POST /oauth2/token
→ OAuth 2.0 Client Credentials 방식으로 접근 토큰 발급
→ POST /api/dostk/chart
→ api-id: ka10081
→ 삼성전자 일봉 데이터 조회
→ POST /api/dostk/stkinfo
→ api-id: ka10001
→ 현재가, PER, EPS, PBR, BPS 기본정보 조회
```

삼성전자 수집 명령:

```bash
cd backend
npm run prices:collect:samsung
```

키움 API를 다시 호출하려면:

```bash
npm run prices:collect:samsung -- --force
```

저장 위치:

```text
data-cache/prices/005930/daily.json
data-cache/prices/005930/basic-info.json
```

저장 정책:

```text
키움 원본 일봉 응답: 로컬 JSON 파일
키움 기본정보 응답: 로컬 JSON 파일
장기 파일 메타데이터: external_data_cache_files
장기 파일 범위: stock_price_cache_ranges
최근 90거래일 화면용 데이터: stock_prices_daily
```

## GET /api/stocks/:stockId/prices

최근 일별 주가를 오래된 날짜부터 반환한다.

요청:

```http
GET /api/stocks/1/prices?days=30
```

`days`는 `1`부터 `90`까지 지정할 수 있다.

응답:

```json
{
  "data": {
    "stock": {
      "stock_id": 1,
      "stock_code": "005930",
      "company_name_ko": "삼성전자"
    },
    "days": 30,
    "source": "database",
    "prices": [
      {
        "trade_date": "2026-05-18",
        "close_price": "100000.0000",
        "volume": 12345678,
        "change_rate": "1.2500"
      }
    ],
    "latest": {
      "trade_date": "2026-06-02",
      "close_price": "101000.0000",
      "volume": 23456789,
      "change_rate": "1.0000"
    }
  }
}
```

`source`는 최근 주가 그래프 데이터 출처이다. DB의 `stock_prices_daily`에 최근 데이터가 있으면 `database`, DB가 비어 있고 로컬 일봉 캐시 파일을 사용하면 `cache_file`이다.

## POST /api/stocks/:stockId/prices/collect

요약분석 화면에서 최근 주가가 없을 때 자동으로 호출한다. 키움 일봉 데이터를 수집해 캐시에 저장하고, 최근 그래프에 필요한 가격 데이터를 함께 반환한다.
외부 API 호출 비용과 쿼터 보호를 위해 로그인 사용자만 실행할 수 있다.

요청:

```http
POST /api/stocks/1/prices/collect
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "days": 30,
  "recentDays": 90,
  "forceRefresh": false
}
```

응답의 `data.prices`와 `data.latest` 형식은 `GET /api/stocks/:stockId/prices`와 같다.
