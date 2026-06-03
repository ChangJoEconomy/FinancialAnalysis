# Financial Analysis

초보 투자자가 재무제표, 주가, 뉴스 데이터를 쉽게 이해할 수 있도록 종목을 초록/주황/빨강 신호와 쉬운 설명으로 보여주는 AI 주식 분석 서비스입니다.

## 실행 요약

처음 실행할 때는 아래 순서로 준비합니다.

```powershell
# 1. Node.js 버전 확인
node -v
npm -v

# 2. 환경변수 파일 생성
Copy-Item .env.example .env

# 3. .env에 Supabase와 외부 API 키 입력

# 4. 아래 "Supabase DB 초기화" 섹션의 순서대로 SQL 적용

# 5. DB 연결 확인
npm --prefix backend run check:db

# 6. KOSPI/KOSDAQ 전체 종목 seed
npm --prefix backend run seed:stocks:krx -- --apply

# 7. 통합 서버 실행
npm start
```

브라우저에서 접속합니다.

```text
http://127.0.0.1:4000
```

백엔드 API는 `/api/*`를 처리하고, 그 외 화면 요청은 `frontend` 폴더의 정적 파일을 같은 서버에서 제공합니다. 전체 기능 확인에는 루트의 `npm start`를 사용하면 됩니다.

## 필요한 설치 항목

| 항목 | 필요 여부 | 설명 |
|---|---:|---|
| Node.js | 필수 | `package.json` 기준 Node.js `18` 이상 |
| npm | 필수 | Node.js와 함께 설치됨 |
| Supabase 프로젝트 | 필수 | DB, Auth, REST API 사용 |
| OpenDART API 키 | 필수 | KOSPI/KOSDAQ 종목의 DART corp code 매칭, DART 재무제표 원본 수집 |
| 키움증권 REST API App Key/Secret | 주가 수집 시 필요 | 일봉, 현재가, PER/PBR 수집 |
| 네이버 검색 API Client ID/Secret | 뉴스 수집 시 필요 | 최근 뉴스 검색 |
| Google Gemini API 키 | AI 설명/뉴스 분석/질문 시 필요 | `.env`의 `LLM_API_KEY` |

현재 루트, 백엔드, 프론트엔드 `package.json`에는 외부 npm 패키지 의존성이 없습니다. 그래도 새 환경에서 npm 메타데이터를 맞춰두고 싶으면 루트에서 `npm install`을 한 번 실행해도 됩니다.

## 프로젝트 구조

```text
FinancialAnalysis
├─ backend
│  └─ src
│     ├─ routes          # HTTP API 라우트
│     ├─ services        # DART, 키움, 네이버, Gemini, 분석 로직
│     ├─ repositories    # Supabase REST 접근
│     ├─ workers         # 데이터 수집/분석 실행 스크립트
│     └─ utils
├─ frontend
│  ├─ index.html
│  ├─ index.css
│  ├─ lib/api.js
│  └─ pages
├─ data-cache            # DART/주가/뉴스/LLM 로컬 캐시
├─ docs                  # DB, API, 캐시, 개발 단계 문서
├─ .env.example
└─ package.json
```

`data-cache`의 실제 JSON 캐시 파일은 Git에 올리지 않습니다. 폴더 구조 유지를 위한 `.gitkeep`만 커밋됩니다.

## 환경변수 설정

루트의 `.env.example`을 복사해 `.env`를 만듭니다.

```powershell
Copy-Item .env.example .env
```

macOS/Linux에서는 다음 명령을 사용할 수 있습니다.

```bash
cp .env.example .env
```

예시:

```env
BACKEND_HOST=127.0.0.1
BACKEND_PORT=4000
FRONTEND_ORIGIN=*

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

DART_API_KEY=your-dart-api-key
STOCK_APP_KEY=your-kiwoom-app-key
STOCK_SECRET_KEY=your-kiwoom-secret-key
KIWOOM_API_BASE_URL=https://api.kiwoom.com

NAVER_CLIENT_ID=your-naver-client-id
NAVER_CLIENT_SECRET=your-naver-client-secret

LLM_API_KEY=your-gemini-api-key
LLM_MODEL=gemini-3-flash-preview

DATA_CACHE_ROOT=./data-cache
```

### 환경변수별 역할

| 변수 | 필수 여부 | 설명 |
|---|---:|---|
| `BACKEND_HOST` | 선택 | 기본값 `127.0.0.1` |
| `BACKEND_PORT` | 선택 | 기본값 `4000`. `PORT`가 있으면 우선 사용 |
| `FRONTEND_ORIGIN` | 선택 | CORS 허용 origin. 기본값 `*` |
| `SUPABASE_URL` | 필수 | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 필수 | 백엔드 DB 읽기/쓰기용 키 |
| `SUPABASE_ANON_KEY` | 필수 | Supabase Auth 호출용 anon 키 |
| `DART_API_KEY` | 필수 | KOSPI/KOSDAQ 종목 seed의 DART corp code 매칭, OpenDART 재무제표 API 키 |
| `STOCK_APP_KEY` | 주가 수집 시 필요 | 키움증권 REST API App Key |
| `STOCK_SECRET_KEY` | 주가 수집 시 필요 | 키움증권 REST API Secret Key |
| `KIWOOM_API_BASE_URL` | 선택 | 기본값 `https://api.kiwoom.com` |
| `NAVER_CLIENT_ID` | 뉴스 수집 시 필요 | 네이버 검색 API Client ID |
| `NAVER_CLIENT_SECRET` | 뉴스 수집 시 필요 | 네이버 검색 API Client Secret |
| `LLM_API_KEY` | AI 생성 시 필요 | Google Gemini API 키 |
| `LLM_MODEL` | 선택 | 기본값 `gemini-3-flash-preview` |
| `DATA_CACHE_ROOT` | 선택 | 기본값 `./data-cache` |

주의할 점:

- `.env`는 Git에 올리지 않습니다.
- `SUPABASE_SERVICE_ROLE_KEY`, DART, 키움, 네이버, Gemini 키는 백엔드 전용입니다.
- 프론트엔드는 API 키를 직접 읽지 않고 같은 출처의 `/api`만 호출합니다.
- 키움증권 REST API는 실행 환경의 공인 IP 등록이 필요할 수 있습니다.

## Supabase DB 초기화

Supabase 프로젝트를 만든 뒤 SQL Editor에서 아래 순서로 실행합니다.

| 순서 | 파일 | 설명 |
|---:|---|---|
| 1 | `docs/db/schema_init_DDL.sql` | public 스키마에 테이블, 타입, 뷰 생성 |
| 2 | `docs/db/db_metric_seed.sql` | PER, PBR, ROE 등 지표 정의 seed |
| 3 | `docs/db/rls_policy_step_2_2.sql` | 선택 적용. 사용자별 데이터 보호 RLS |

`schema_init_DDL.sql`은 개발용 reset 스크립트입니다. 기존 프로젝트 테이블을 drop 후 재생성하므로 실제 데이터가 있는 DB에는 신중하게 실행해야 합니다.

SQL 적용 후 DB 연결을 확인합니다.

```powershell
npm --prefix backend run check:db
```

성공하면 `metric_definitions` 테이블 접근이 정상이라는 뜻입니다.

그 다음 KOSPI/KOSDAQ 전체 종목 마스터를 입력합니다.

```powershell
# 먼저 dry-run으로 수집 개수와 샘플 확인
npm --prefix backend run seed:stocks:krx

# 확인 후 Supabase에 실제 저장
npm --prefix backend run seed:stocks:krx -- --apply
```

이 워커는 KRX KIND 상장법인 목록에서 KOSPI/KOSDAQ 종목을 가져오고, OpenDART corpCode 목록으로 `dart_corp_code`를 매칭한 뒤 `stocks`와 `stock_aliases`에 저장합니다. 기본 실행은 dry-run이며, 실제 저장에는 반드시 `-- --apply`가 필요합니다.

`docs/db/seed_samsung_stock.sql`과 `npm --prefix backend run seed:stock:samsung`은 전체 종목 seed를 돌리지 못하는 상황에서 삼성전자 1개만 빠르게 넣어보는 개발용 보조 수단입니다.

## 로컬 실행

루트에서 실행합니다.

```powershell
npm start
```

개발용으로도 같은 통합 서버를 씁니다.

```powershell
npm run dev
```

접속 주소:

```text
http://127.0.0.1:4000
```

주요 화면:

```text
/
/home
/search
/login
/signup
/account
/favorites
/summary/1
```

주요 확인 API:

```text
http://127.0.0.1:4000/api
http://127.0.0.1:4000/api/health
http://127.0.0.1:4000/api/health/db
http://127.0.0.1:4000/api/stocks/search?q=005930
http://127.0.0.1:4000/api/stocks/1/summary
```

프론트엔드만 정적 화면으로 확인하고 싶을 때는 다음 명령을 사용할 수 있습니다.

```powershell
npm --prefix frontend start
```

이 경우 기본 주소는 `http://127.0.0.1:3000`입니다. 단, 독립 프론트 서버는 API 프록시를 제공하지 않으므로 전체 기능 확인에는 루트의 `npm start`를 사용하세요.

## 데모 분석 데이터 준비

종목 마스터는 KOSPI/KOSDAQ 전체가 들어가는 것이 기본입니다. 아래 명령은 그중 삼성전자(`005930`)를 기준으로 재무, 주가, 뉴스, AI 설명 데모 데이터를 준비하는 흐름입니다.

```powershell
# 1. DB 연결 확인
npm --prefix backend run check:db

# 2. KOSPI/KOSDAQ 전체 종목 입력
npm --prefix backend run seed:stocks:krx -- --apply

# 3. 최근 주가, 키움 기본정보, PER/PBR용 캐시 수집
npm --prefix backend run prices:collect:samsung

# 4. DART 2024 및 전년도 annual 데이터를 보장하고 재무 지표 저장
npm --prefix backend run financial:metrics:samsung

# 5. 규칙 기반 신호등 분석 저장
npm --prefix backend run analysis:traffic-light:samsung

# 6. Gemini 초보자용 설명 저장
npm --prefix backend run analysis:llm-explanation:samsung

# 7. 네이버 뉴스 수집 및 Gemini 뉴스 영향 분석 저장
npm --prefix backend run news:collect:samsung

# 8. 캐시 정책과 현재 캐시 상태 확인
npm --prefix backend run cache:policy:check
```

외부 API를 다시 호출하려면 지원되는 워커에 `--force`를 붙입니다.

```powershell
npm --prefix backend run prices:collect:samsung -- --force
npm --prefix backend run news:collect:samsung -- --force
npm --prefix backend run dart:collect:samsung -- 2024 annual --force
```

재무 데이터를 단계별로 확인하고 싶으면 아래 명령을 순서대로 실행합니다.

```powershell
npm --prefix backend run dart:collect:samsung -- 2024 annual
npm --prefix backend run dart:collect:samsung -- 2023 annual
npm --prefix backend run financial:snapshot:samsung -- 2024 annual
npm --prefix backend run financial:snapshot:samsung -- 2023 annual
npm --prefix backend run financial:line-items:samsung -- 2024 annual
npm --prefix backend run financial:line-items:samsung -- 2023 annual
npm --prefix backend run financial:metrics:samsung -- 2024
```

## 워커 명령 모음

| 명령 | 설명 |
|---|---|
| `npm --prefix backend run check:db` | Supabase REST 연결 확인 |
| `npm --prefix backend run seed:stocks:krx` | KOSPI/KOSDAQ 전체 종목 dry-run |
| `npm --prefix backend run seed:stocks:krx -- --apply` | KOSPI/KOSDAQ 전체 종목과 기본 별칭을 Supabase에 저장 |
| `npm --prefix backend run seed:stock:samsung` | 전체 종목 seed를 생략할 때 쓰는 삼성전자 1개 개발용 seed |
| `npm --prefix backend run cache:demo:samsung-dart` | DART 캐시 메타데이터 smoke test |
| `npm --prefix backend run cache:policy:check` | 캐시 TTL 정책과 현재 캐시 상태 확인 |
| `npm --prefix backend run dart:collect:samsung` | 삼성전자 DART 원본 수집 |
| `npm --prefix backend run financial:snapshot:samsung` | 재무제표 스냅샷 저장 |
| `npm --prefix backend run financial:line-items:samsung` | 주요 재무 항목 저장 |
| `npm --prefix backend run financial:metrics:samsung` | PER/PBR/ROE/부채비율 등 지표 저장 |
| `npm --prefix backend run analysis:traffic-light:samsung` | 규칙 기반 신호등 분석 저장 |
| `npm --prefix backend run analysis:llm-explanation:samsung` | Gemini 설명 저장 |
| `npm --prefix backend run prices:collect:samsung` | 키움 일봉과 기본정보 수집 |
| `npm --prefix backend run news:collect:samsung` | 네이버 뉴스와 뉴스 AI 분석 저장 |

## API 빠른 확인

한글 검색은 URL 인코딩을 위해 `curl -G`와 `--data-urlencode`를 쓰면 편합니다.

```powershell
curl.exe -G "http://127.0.0.1:4000/api/stocks/search" --data-urlencode "q=삼성전자"
curl.exe "http://127.0.0.1:4000/api/stocks/1"
curl.exe "http://127.0.0.1:4000/api/stocks/1/prices?days=30"
curl.exe "http://127.0.0.1:4000/api/stocks/1/news?limit=5"
```

인증이 필요한 API는 로그인 후 받은 `accessToken`을 `Authorization` 헤더에 넣습니다.

```http
Authorization: Bearer <accessToken>
```

대표 인증 API:

```text
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

사용자별 데이터 API:

```text
GET    /api/me/favorite-stocks
POST   /api/me/favorite-stocks
PATCH  /api/me/favorite-stocks/:favoriteId
DELETE /api/me/favorite-stocks/:favoriteId
GET    /api/me/search-histories
GET    /api/me/analysis-settings
PUT    /api/me/analysis-settings
GET    /api/me/chat-sessions
POST   /api/me/chat-sessions
GET    /api/me/chat-sessions/:chatSessionId/messages
POST   /api/me/chat-sessions/:chatSessionId/messages
```

종목 API:

```text
GET  /api/stocks/search?q=삼성전자
GET  /api/stocks/popular
GET  /api/stocks/:stockId
GET  /api/stocks/:stockId/summary
POST /api/stocks/:stockId/analyze
GET  /api/stocks/:stockId/financials?fiscalYear=2024
GET  /api/stocks/:stockId/prices?days=30
POST /api/stocks/:stockId/prices/collect
GET  /api/stocks/:stockId/news?limit=5
POST /api/stocks/:stockId/news/refresh
```

상세 API 설명은 `docs/api` 아래 문서를 참고하세요.

## 캐시 구조

대용량 원본 데이터는 DB가 아니라 `data-cache` 아래 로컬 파일로 저장하고, Supabase에는 파일 경로와 메타데이터만 저장합니다.

```text
data-cache
├─ dart
│  └─ 005930
│     ├─ 2023
│     └─ 2024
├─ prices
│  └─ 005930
├─ news
│  └─ 005930
└─ llm
   └─ analysis
      └─ 005930
```

캐시 TTL:

| 데이터 | cache_type | TTL |
|---|---|---:|
| DART 재무제표 원본 | `dart_raw` | 30일 |
| 키움 일봉 원본 | `price_daily` | 1일 |
| 키움 종목 기본정보 | `stock_basic_info` | 1일 |
| 네이버 뉴스 검색 원본 | `news_raw` | 6시간 |
| 재무 신호등 및 LLM 설명 | `financial_analysis` | 7일 |

캐시 상세 정책은 `docs/cache_structure.md`와 `docs/api/cache.md`에 정리되어 있습니다.

## 문제 해결

`Missing required environment variable`이 나오면 `.env`에 해당 키가 비어 있는지 확인합니다. 백엔드는 루트 `.env`, `backend/.env`, 상위 `.env`를 순서대로 읽습니다.

`/api/health/db`가 실패하면 Supabase URL, service role key, `schema_init_DDL.sql`, `db_metric_seed.sql` 적용 여부를 확인합니다.

포트 충돌이 나면 `.env`에서 `BACKEND_PORT`를 바꾸거나 이미 실행 중인 서버를 종료합니다.

키움 수집이 실패하면 `STOCK_APP_KEY`, `STOCK_SECRET_KEY`, 키움 REST API 사용 권한, 공인 IP 등록 상태를 확인합니다.

DART 수집이 실패하면 `DART_API_KEY`, 종목의 `dart_corp_code`, 요청한 사업연도와 보고서 유형을 확인합니다.

Gemini나 네이버 호출이 실패하면 일부 워커는 규칙 기반 fallback을 저장할 수 있습니다. 실제 Gemini 설명과 뉴스 영향 분석을 쓰려면 `LLM_API_KEY`, `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 설정해야 합니다.

## 참고 문서

| 문서 | 내용 |
|---|---|
| `docs/local_run.md` | 통합 서버 실행 방식 |
| `docs/project_dev_step.md` | 전체 개발 단계와 MVP 상태 |
| `docs/db_structure.md` | DB 구조와 500MB 용량 전략 |
| `docs/cache_structure.md` | 로컬 캐시 구조 |
| `docs/api/*.md` | API별 상세 설명 |
| `docs/db/*.sql` | Supabase DDL, seed, RLS 정책 |
