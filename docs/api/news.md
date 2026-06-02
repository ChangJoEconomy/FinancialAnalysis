# News Analysis API

Phase 17은 네이버 검색 API의 뉴스 검색 결과를 수집하고 Gemini로 종목 영향을 해석한다.

## 환경변수

프로젝트 루트 `.env`에만 저장한다.

```env
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
```

프론트엔드에는 네이버 인증정보를 전달하지 않는다.

## 외부 API

네이버 검색 API는 비로그인 오픈 API다. 백엔드가 HTTP 헤더에 Client ID와 Client Secret을 넣어 호출한다.

```http
GET https://openapi.naver.com/v1/search/news.json?query=삼성전자&display=10&start=1&sort=date
X-Naver-Client-Id: <NAVER_CLIENT_ID>
X-Naver-Client-Secret: <NAVER_CLIENT_SECRET>
```

## 저장 정책

```text
네이버 검색 원본 응답
→ data-cache/news/005930/YYYY-MM-DD.json
→ external_data_cache_files(cache_type=news_raw)

기사 메타데이터
→ news_articles

종목 관련도
→ stock_news

Gemini 영향 분석
→ news_ai_analyses(prompt_version=llm-news-v1)
```

네이버 검색 응답은 제목, 요약, URL, 발행일 메타데이터다. 기사 원문 전문을 복제해 저장하지 않는다.

## GET /api/stocks/:stockId/news

저장된 최근 뉴스와 AI 영향 분석을 조회한다.

```http
GET /api/stocks/1/news?limit=5
```

`limit`은 `1`부터 `10`까지 지정할 수 있다.

## POST /api/stocks/:stockId/news/refresh

네이버 검색 API에서 최신 뉴스를 수집하고 Gemini 영향 분석을 저장한다.

```http
POST /api/stocks/1/news/refresh
Content-Type: application/json

{
  "limit": 5,
  "forceRefresh": true
}
```

처리 흐름:

```text
1. 유효한 날짜별 네이버 뉴스 캐시를 확인한다.
2. 캐시가 없거나 forceRefresh=true이면 네이버 뉴스 검색 API를 호출한다.
3. HTML 태그를 제거하고 기사 메타데이터를 upsert한다.
4. 종목명 매칭 기반 관련도를 stock_news에 저장한다.
5. Gemini가 positive / negative / neutral / mixed를 분류한다.
6. 영향 신호, 영향 기간, 이유, 확인 키워드를 news_ai_analyses에 저장한다.
7. Gemini 호출이 실패하면 보수적인 키워드 기반 임시 분류를 저장한다.
```

## Worker

삼성전자 수집:

```bash
cd backend
npm run news:collect:samsung
```

외부 API와 Gemini를 다시 호출하려면:

```bash
npm run news:collect:samsung -- --force
```
