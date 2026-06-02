# AI 주식 분석 서비스 프로젝트 진행 단계

> 현재 상태: **삼성전자 기준 검색 → DART 재무 → 키움 주가 → 네이버 뉴스 → 규칙 기반 신호등 → Gemini 설명 → 요약·상세·관심종목·AI 질문 화면까지 MVP 흐름 연결 완료**
> 다음 목표: **삼성전자 전체 데모 흐름 검증 → 발표 시나리오 정리 → 테스트 종목 5개 확장**

---

## 0. 프로젝트 핵심 방향

이 서비스는 주식 데이터를 많이 보여주는 서비스가 아니라, 초보 투자자가 이해하기 어려운 재무제표와 지표를 **초록 / 주황 / 빨강 신호와 쉬운 설명으로 번역하는 서비스**이다.

AI의 역할은 다음과 같다.

```text
매수/매도 추천 X
복잡한 재무 정보 해석 O
지표별 위험도 설명 O
초보자용 용어 설명 O
종목 상황에 맞는 추가 질문 응답 O
```

한 학기 프로젝트 기준으로는 아래 우선순위를 따른다.

```text
1순위: 재무정보 기반 AI 신호등 분석
2순위: 관심종목 / AI 추가 질문
3순위: 최근 주가 그래프
4순위: 뉴스 분석
```

---

## 1. 전체 개발 흐름

최종 서비스 흐름은 다음과 같다.

```text
HOME
→ 종목 검색
→ 요약분석
→ 재무상세
→ AI 질문
→ 관심종목
→ 뉴스분석
```

개발은 처음부터 모든 종목을 대상으로 하지 말고, 대표 종목 1개 또는 5개로 끝까지 연결한 뒤 확장한다.

추천 개발 순서:

```text
삼성전자 1개 종목으로 전체 기능 완성
→ 테스트 종목 5개로 확장
→ 전체 종목 또는 주요 종목으로 확장
```

---

## 2. 현재 완료된 단계

현재 완료된 작업은 다음과 같다.

| 구분 | 상태 | 설명 |
|---|---:|---|
| DB 구조 설계 | 완료 | 사용자, 종목, 재무, AI 분석, 뉴스, 캐시 구조 설계 |
| Supabase 테이블 생성 | 완료 | public 스키마 기준 프로젝트 테이블 생성 |
| metric seed 입력 | 완료 | PER, ROE, 부채비율, 영업이익률 등 기본 지표 정의 입력 |
| 대용량 데이터 처리 방향 결정 | 완료 | DB에는 메타데이터와 분석 결과, 대용량 원본은 서버 로컬 파일 캐시 사용 |

앞으로는 DB에 실제 데이터를 넣고, 백엔드 API와 프론트 화면을 연결하면 된다.

---

# Phase 1. 기본 프로젝트 구조 세팅

## Step 1-1. 프로젝트 폴더 구조 정리

추천 구조:

```text
project-root
├─ frontend
│  ├─ pages
│  ├─ components
│  ├─ hooks
│  └─ lib
│
├─ backend
│  ├─ src
│  │  ├─ routes
│  │  ├─ services
│  │  ├─ repositories
│  │  ├─ workers
│  │  └─ utils
│  └─ package.json
│
├─ data-cache
│  ├─ dart
│  ├─ prices
│  ├─ news
│  └─ llm
│
└─ docs
   ├─ db
   ├─ api
   └─ project-plan.md
```

역할 구분:

| 영역 | 역할 |
|---|---|
| frontend | 화면 구현, 사용자 입력 처리 |
| backend | API 제공, 외부 API 호출, AI 분석 실행 |
| data-cache | DART 원본, 장기 주가, 뉴스 원문 등 대용량 파일 저장 |
| Supabase PostgreSQL | 사용자, 종목, 주요 지표, AI 결과, 캐시 메타데이터 저장 |

완료 기준:

```text
프론트엔드와 백엔드가 분리되어 실행된다.
백엔드에서 Supabase DB에 연결할 수 있다.
로컬 캐시 폴더가 준비되어 있다.
```

현재 완료 내용:

```text
frontend
- 독립 실행용 package.json, server.js, index.html 생성
- pages, components, hooks, lib 폴더 준비

backend
- 독립 실행용 package.json 생성
- src/routes, src/services, src/repositories, src/workers, src/utils 폴더 준비
- /api/health, /api/health/db 헬스 체크 API 생성
- Supabase metric_definitions 테이블 연결 확인 스크립트 생성

data-cache
- dart, prices, news, llm 폴더 준비

docs
- api 문서 폴더 및 health API 문서 추가
```

확인한 명령:

```bash
cd backend
npm run check:db

cd ../frontend
npm start

cd ../backend
npm start
```

---

## Step 1-2. 환경변수 정리

백엔드 환경변수 예시:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=

DART_API_KEY=
STOCK_APP_KEY=
STOCK_SECRET_KEY=
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
LLM_API_KEY=

DATA_CACHE_ROOT=./data-cache
```

현재 LLM 설정:

```text
Provider: Google Gemini API
Model: gemini-3-flash-preview
API Key: LLM_API_KEY
```

주의사항:

```text
SUPABASE_SERVICE_ROLE_KEY는 절대 프론트엔드에 노출하지 않는다.
DART_API_KEY, STOCK_APP_KEY, STOCK_SECRET_KEY, NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, LLM_API_KEY도 백엔드에서만 사용한다.
프론트엔드는 백엔드 API만 호출한다.
```

완료 기준:

```text
백엔드에서 환경변수를 읽을 수 있다.
DB 연결 테스트가 성공한다.
외부 API 키는 서버 코드에서만 사용된다.
```

---

# Phase 2. 사용자 인증 및 프로필 연결

## Step 2-1. Supabase Auth 연결

Supabase Auth를 사용해 로그인 기능을 만든다.

사용 구조:

```text
auth.users
- Supabase가 관리하는 실제 로그인 계정

public.users
- 서비스에서 사용하는 사용자 프로필
- nickname, status, last_login_at 등 저장
```

처리 흐름:

```text
1. 사용자가 회원가입 또는 로그인한다.
2. Supabase Auth에서 auth.users.id가 생성된다.
3. public.users에 동일한 user_id로 프로필을 생성한다.
4. 이후 관심종목, 검색기록, AI 질문 등은 이 user_id와 연결한다.
```

완료 기준:

```text
회원가입 가능
로그인 가능
로그인 후 public.users에 사용자 프로필 존재
```

현재 완료 내용:

```text
backend
- POST /api/auth/signup 구현
- POST /api/auth/login 구현
- GET /api/auth/me 구현
- POST /api/auth/logout 구현
- Supabase Auth 사용자 생성/로그인 후 public.users 프로필 생성 또는 갱신

frontend
- 개발용 회원가입/로그인 화면 구현
- accessToken을 localStorage에 저장하고 /api/auth/me로 현재 사용자 확인

docs
- docs/api/auth.md 추가
```

구현 참고:

```text
현재 DB DDL에서 public.users.user_id는 BIGINT IDENTITY이다.
따라서 Supabase auth.users.id UUID는 public.users.provider_user_id에 저장한다.
서비스 내부 테이블은 기존 설계대로 public.users.user_id를 참조한다.
```

---

## Step 2-2. 사용자별 데이터 보호 준비

사용자별로 보호해야 하는 테이블:

```text
users
user_analysis_settings
stock_search_histories
favorite_stocks
ai_chat_sessions
ai_chat_messages
```

공개 조회 가능성이 있는 테이블:

```text
stocks
stock_aliases
metric_definitions
```

초기 개발 단계에서는 기능 구현을 우선하고, 발표 전에는 RLS 정책을 정리한다.

완료 기준:

```text
사용자별 관심종목과 검색 기록이 user_id 기준으로 분리된다.
다른 사용자의 관심종목이나 채팅 기록을 조회하지 않는다.
```

현재 완료 내용:

```text
backend
- Authorization Bearer 토큰 기반 requireAuthContext 추가
- public.users.provider_user_id로 Supabase Auth 사용자와 서비스 user_id 매핑
- GET /api/me/favorite-stocks 구현
- POST /api/me/favorite-stocks 구현
- DELETE /api/me/favorite-stocks/:favoriteId 구현
- GET /api/me/search-histories 구현
- POST /api/me/search-histories 구현
- GET /api/me/chat-sessions 구현
- GET /api/me/chat-sessions/:chatSessionId/messages 구현

docs
- docs/api/user-scoped-data.md 추가
- docs/db/rls_policy_step_2_2.sql 추가
```

보호 원칙:

```text
요청 body에서 user_id를 받지 않는다.
백엔드가 accessToken으로 로그인 사용자를 확인한 뒤 user_id를 서버에서 주입한다.
관심종목, 검색 기록, 채팅 세션 조회는 항상 user_id=현재 사용자 조건을 포함한다.
채팅 메시지는 먼저 세션 소유권을 확인한 뒤 조회한다.
```

RLS 적용 메모:

```text
현재 백엔드는 service_role으로 Supabase REST를 호출하므로 API 레벨 user_id 필터가 1차 보호 장치이다.
docs/db/rls_policy_step_2_2.sql은 anon/authenticated 키로 직접 Supabase에 접근할 때를 대비한 안전장치이다.
Supabase SQL Editor에서 실행하면 공개 테이블은 SELECT만 허용하고 사용자 테이블은 auth.uid() 기준 자기 데이터만 허용한다.
```

---

# Phase 3. 종목 마스터 데이터 입력

## Step 3-1. 테스트 종목 선정

처음에는 전체 종목이 아니라 아래 5개 종목으로 시작한다.

```text
삼성전자
SK하이닉스
현대차
NAVER
카카오
```

이 중 첫 번째 개발 기준 종목은 **삼성전자**로 잡는다.

---

## Step 3-2. stocks 테이블 입력

`stocks` 테이블에 필요한 정보:

| 컬럼 | 예시 |
|---|---|
| stock_code | 005930 |
| ticker | 005930.KS |
| company_name_ko | 삼성전자 |
| company_name_en | Samsung Electronics |
| market | KOSPI |
| dart_corp_code | 00126380 |
| industry_name | 반도체 / 전자제품 등 |
| is_active | true |

완료 기준:

```text
stocks 테이블에 테스트 종목 5개가 들어간다.
각 종목은 stock_id로 식별된다.
```

현재 완료 내용:

```text
테스트를 위해 삼성전자 1개 종목을 먼저 입력했다.

stocks
- stock_id: 1
- stock_code: 005930
- ticker: 005930.KS
- company_name_ko: 삼성전자
- company_name_en: Samsung Electronics
- market: KOSPI
- dart_corp_code: 00126380
- industry_name: 반도체 / 전자제품
- is_active: true

실행 명령:
cd backend
npm run seed:stock:samsung
```

조회 테스트 결과:

```text
stock_code=005930 조회 성공
company_name_ko=삼성전자 확인
stock_id=1 확인
```

---

## Step 3-3. stock_aliases 테이블 입력

사용자는 종목을 다양한 방식으로 검색할 수 있다.

삼성전자 예시:

```text
삼성전자
삼전
005930
Samsung Electronics
Samsung
```

저장 위치:

```text
stock_aliases
```

완료 기준:

```text
"삼성전자" 검색 가능
"삼전" 검색 가능
"005930" 검색 가능
```

현재 완료 내용:

```text
삼성전자 별칭 5개 입력 완료

stock_aliases
- 삼성전자
- 삼전
- 005930
- Samsung Electronics
- Samsung

조회 테스트:
- alias_name=삼성전자 조회 성공
- alias_name=삼전 조회 성공
- alias_name=005930 조회 성공
```

---

# Phase 4. 종목 검색 기능 구현

## Step 4-1. 검색 API 만들기

API 예시:

```http
GET /stocks/search?q=삼성전자
```

검색 대상:

```text
stocks.company_name_ko
stocks.company_name_en
stocks.stock_code
stock_aliases.alias_name
```

반환 예시:

```json
[
  {
    "stock_id": "uuid",
    "stock_code": "005930",
    "ticker": "005930.KS",
    "company_name_ko": "삼성전자",
    "market": "KOSPI",
    "industry_name": "반도체"
  }
]
```

완료 기준:

```text
검색어 입력 시 관련 종목 목록이 반환된다.
별칭 검색도 동작한다.
```

현재 완료 내용:

```text
backend
- GET /api/stocks/search?q=검색어 구현
- 문서 예시 호환용 GET /stocks/search?q=검색어 구현
- stocks.company_name_ko 검색
- stocks.company_name_en 검색
- stocks.stock_code 검색
- stocks.ticker 검색
- stock_aliases.alias_name 검색
- stocks 결과와 aliases 결과를 stock_id 기준으로 중복 제거

docs
- docs/api/stocks.md 추가
```

조회 테스트:

```text
curl -G http://127.0.0.1:4000/api/stocks/search --data-urlencode q=삼성전자
curl -G http://127.0.0.1:4000/api/stocks/search --data-urlencode q=삼전
GET /api/stocks/search?q=005930
```

---

## Step 4-2. 검색 기록 저장

사용자가 검색 결과를 클릭하면 검색 기록을 저장한다.

사용 테이블:

```text
stock_search_histories
```

저장 데이터:

| 컬럼 | 설명 |
|---|---|
| user_id | 로그인 사용자 ID |
| query_text | 사용자가 입력한 검색어 |
| stock_id | 선택한 종목 ID |
| result_count | 검색 결과 수 |
| searched_at | 검색 시각 |

완료 기준:

```text
사용자가 삼성전자를 검색하고 클릭하면 stock_search_histories에 기록된다.
최근 본 종목 목록을 만들 수 있다.
```

현재 완료 내용:

```text
backend
- POST /api/stocks/search-click 구현
- POST /stocks/search-click 문서 예시 호환 경로 구현
- accessToken으로 현재 로그인 사용자 확인
- 요청 body에서 user_id를 받지 않고 서버가 user_id 주입
- stock_search_histories에 query_text, stock_id, result_count, searched_at 저장
- GET /api/me/search-histories로 최근 검색 기록 조회 가능

frontend
- 개발용 종목 검색 UI 추가
- 검색 결과 클릭 시 POST /api/stocks/search-click 호출
- 저장 후 최근 검색 기록 목록 갱신

docs
- docs/api/stocks.md에 검색 클릭 저장 API 추가
```

테스트 흐름:

```text
1. 백엔드 실행
2. 프론트엔드 실행
3. 회원가입 또는 로그인
4. 삼성전자 검색
5. 검색 결과에서 삼성전자 클릭
6. 최근 검색 기록에 삼성전자 표시 확인
```

---

## Step 4-3. HOME 화면 구현

HOME 화면 구성:

```text
검색창
최근 본 종목
인기 검색종목
```

사용 테이블:

```text
stocks
stock_aliases
stock_search_histories
```

완료 기준:

```text
HOME에서 종목 검색 가능
검색 결과 클릭 시 요약분석 화면으로 이동
최근 검색 기록 표시 가능
```

현재 완료 내용:

```text
frontend
- Google 검색창처럼 중앙에 큰 검색 오브젝트 배치
- HOME에서 삼성전자 검색 가능
- 검색 결과 클릭 시 같은 화면의 요약분석 영역으로 이동
- 로그인 상태이면 검색 결과 클릭 시 검색 기록 저장
- 최근 본 종목 표시
- 인기 검색종목 표시
- 회원가입 / 로그인 / 내 정보 / 로그아웃 테스트 UI 제공

backend
- GET /api/stocks/popular 구현
- stock_search_histories 최근 기록을 stock_id 기준으로 집계
```

테스트 흐름:

```text
1. 백엔드 실행
2. 프론트엔드 실행
3. HOME 중앙 검색창에서 삼성전자 검색
4. 검색 결과 클릭
5. 요약분석 영역 표시 확인
6. 로그인 후 다시 검색 결과 클릭
7. 최근 본 종목에 검색 기록 표시 확인
8. 인기 검색종목 집계 표시 확인
```

---

# Phase 5. 서버 로컬 파일 캐시 구조 구현

## Step 5-1. 로컬 캐시 폴더 구조 만들기

추천 구조:

```text
data-cache
├─ dart
│  └─ 005930
│     ├─ 2023
│     │  ├─ annual.json
│     │  ├─ q1.json
│     │  ├─ q2.json
│     │  └─ q3.json
│     └─ 2024
│        ├─ annual.json
│        ├─ q1.json
│        ├─ q2.json
│        └─ q3.json
│
├─ prices
│  └─ 005930
│     ├─ daily.csv
│     ├─ daily.parquet
│     └─ meta.json
│
├─ news
│  └─ 005930
│     └─ 2026-05-18.json
│
└─ llm
   └─ analysis
      └─ 005930
         └─ 2026-05-18-summary.json
```

현재 완료 내용:

```text
삼성전자(005930) 기준 로컬 캐시 폴더 구조 생성 완료

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

관리 방식:

```text
실제 DART, 주가, 뉴스, LLM 캐시 파일은 Git에 올리지 않는다.
.gitignore에서 data-cache 실제 파일은 제외하고 .gitkeep만 허용한다.
캐시 구조 설명은 docs/cache_structure.md에 정리했다.
```

---

## Step 5-2. 캐시 메타데이터 DB 저장

대용량 파일은 DB에 직접 저장하지 않고, 파일 경로와 상태만 저장한다.

사용 테이블:

```text
external_data_cache_files
stock_price_cache_ranges
```

`external_data_cache_files`에 저장할 내용:

| 항목 | 설명 |
|---|---|
| provider | DART, STOCK_API, NEWS_API, LLM |
| target_type | stock, financial_statement, price, news, analysis |
| target_id | 관련 종목 또는 데이터 ID |
| file_path | 서버 로컬 파일 경로 |
| file_size_bytes | 파일 크기 |
| content_hash | 중복 확인용 해시 |
| data_started_at | 데이터 시작 기준일 |
| data_ended_at | 데이터 종료 기준일 |
| expires_at | 캐시 만료 시각 |

완료 기준:

```text
DART API 응답 원본이 로컬 JSON 파일로 저장된다.
DB에는 해당 파일의 경로와 메타데이터가 저장된다.
같은 데이터를 다시 요청하면 API를 호출하지 않고 캐시 파일을 사용한다.
```

현재 완료 내용:

```text
backend
- 로컬 캐시 경로 유틸 구현
- JSON 캐시 파일 저장 구현
- SHA-256 content_hash 계산 구현
- file size(byte_size) 계산 구현
- external_data_cache_files upsert 구현
- logical_key 기반 fresh cache 조회 구현
- 삼성전자 DART annual 캐시 메타데이터 smoke test worker 추가

docs
- docs/api/cache.md 추가
- docs/cache_structure.md에 메타데이터 저장 흐름 추가
```

검증 명령:

```bash
cd backend
npm run cache:demo:samsung-dart
```

검증 시 확인할 내용:

```text
data-cache/dart/005930/2024/annual.json 파일 생성
external_data_cache_files에 logical_key=DART:dart_raw:005930:2024:annual 기록 저장
같은 명령 재실행 시 fresh cache를 찾아 cacheHit=true 반환
```

주의:

```text
현재 annual.json은 Step 5-2 메타데이터 흐름 확인용 smoke-test payload다.
실제 DART API 원본 응답 저장은 Step 6-1에서 같은 캐시 레이어를 사용해 구현한다.
```

---

# Phase 6. DART 재무 데이터 수집

## Step 6-1. DART 수집 서비스 만들기

처리 흐름:

```text
1. stock_id로 종목 정보를 조회한다.
2. dart_corp_code를 확인한다.
3. 해당 종목/연도/분기의 캐시 파일이 있는지 확인한다.
4. 캐시가 있으면 로컬 파일을 읽는다.
5. 캐시가 없으면 DART API를 호출한다.
6. 원본 응답 JSON을 로컬 파일로 저장한다.
7. DB에는 필요한 재무제표 정보만 정리해서 저장한다.
```

완료 기준:

```text
삼성전자 재무제표 원본 JSON을 수집한다.
수집한 원본은 data-cache/dart/005930 아래 저장된다.
external_data_cache_files에 캐시 기록이 남는다.
```

현재 완료 내용:

```text
backend
- stock_id로 종목 조회 구현
- dart_corp_code 확인 구현
- DART fnlttSinglAcntAll.json 호출 구현
- 연간/분기 report type 매핑 구현
- logical_key 기반 캐시 조회 구현
- 유효한 캐시 파일이 있으면 DART API 호출 생략
- DART 원본 JSON을 data-cache/dart/005930/<year> 아래 저장
- external_data_cache_files 메타데이터 저장 연결
- 삼성전자 수집 검증 worker 추가

docs
- docs/api/dart.md 추가
```

기존 stock-details.js에서 재활용한 부분:

```text
DART API 엔드포인트: fnlttSinglAcntAll.json
사업보고서 reprt_code: 11011
연결재무제표 fs_div: CFS
DART 응답 status 확인 방식
```

정리:

```text
루트의 기존 stock-details.js는 Express/Mongoose/Yahoo 로직이 섞인 구형 컨트롤러라 현재 백엔드 구조에서는 제거했다.
DART 수집에 필요한 호출 규칙은 backend/src/services/dartFinancialService.js로 옮겼다.
```

검증 명령:

```bash
cd backend
npm run dart:collect:samsung
```

현재 검증 상태:

```text
DART 직접 호출 검증 성공
- corp_code=00126380
- fiscalYear=2024
- reprt_code=11011
- status=000
- itemCount=213

전체 worker 검증은 Supabase REST 연결 실패로 보류
- npm run check:db 실패
- 원인: Supabase REST network request failed
- Supabase 연결이 복구되면 npm run dart:collect:samsung 재실행 필요
```

---

## Step 6-2. 재무제표 스냅샷 저장

사용 테이블:

```text
financial_statement_snapshots
```

저장 단위:

```text
종목
사업연도
분기
보고서 종류
재무제표 종류
데이터 출처
DART 보고서 번호
```

예시:

| 항목 | 값 |
|---|---|
| stock | 삼성전자 |
| fiscal_year | 2024 |
| quarter | Annual |
| period_type | annual |
| statement_type | income_statement |
| source_provider | DART |

완료 기준:

```text
삼성전자 2024년 손익계산서 snapshot 저장
삼성전자 2024년 재무상태표 snapshot 저장
삼성전자 2024년 현금흐름표 snapshot 저장
```

현재 완료 내용:

```text
backend
- DART 원본 캐시에서 재무제표 종류별 스냅샷 생성 구현
- BS -> balance_sheet 매핑
- IS -> income_statement 매핑
- CF -> cash_flow 매핑
- financial_statement_snapshots upsert 구현
- cache_file_id로 external_data_cache_files와 연결
- 삼성전자 2024 annual 스냅샷 저장 worker 추가

docs
- docs/api/financial-statements.md 추가
```

검증 명령:

```bash
cd backend
npm run financial:snapshot:samsung
```

검증 결과:

```text
삼성전자 2024 annual 스냅샷 3개 저장 완료

statement_id=1
- statement_type: balance_sheet
- report_name: 재무상태표
- cache_file_id: 1

statement_id=2
- statement_type: income_statement
- report_name: 손익계산서
- cache_file_id: 1

statement_id=3
- statement_type: cash_flow
- report_name: 현금흐름표
- cache_file_id: 1

재실행 시 같은 statement_id를 반환해 중복 생성 없이 upsert 동작 확인
```

---

## Step 6-3. 재무제표 주요 항목 저장

사용 테이블:

```text
financial_line_items
```

우선 저장할 항목:

```text
매출액
영업이익
당기순이익
자산총계
부채총계
자본총계
현금및현금성자산
영업활동현금흐름
```

완료 기준:

```text
financial_line_items에서 삼성전자의 주요 재무 항목을 조회할 수 있다.
```

현재 완료 내용:

```text
backend
- DART 원본 캐시에서 주요 계정 추출 구현
- financial_line_items upsert 구현
- 삼성전자 2024 annual 주요 항목 저장 worker 추가

저장 대상
- 자산총계
- 부채총계
- 자본총계
- 현금및현금성자산
- 매출액
- 영업이익
- 당기순이익
- 영업활동현금흐름

docs
- docs/api/financial-line-items.md 추가
```

검증 명령:

```bash
cd backend
npm run financial:line-items:samsung
```

검증 결과:

```text
삼성전자 2024 annual 주요 항목 8개 저장 완료
missing: []

line_item_id=1 자산총계 514,531,948,000,000
line_item_id=2 부채총계 112,339,878,000,000
line_item_id=3 자본총계 402,192,070,000,000
line_item_id=4 현금및현금성자산 53,705,579,000,000
line_item_id=5 매출액 300,870,903,000,000
line_item_id=6 영업이익 32,725,961,000,000
line_item_id=7 당기순이익 34,451,351,000,000
line_item_id=8 영업활동현금흐름 72,982,621,000,000

재실행 시 같은 line_item_id를 반환해 중복 생성 없이 upsert 동작 확인
```

---

# Phase 7. 주요 재무 지표 계산

## Step 7-1. 계산할 지표 우선순위

초기 구현 지표:

| 우선순위 | 지표 | 이유 |
|---:|---|---|
| 1 | 부채비율 | 안정성 판단 핵심 |
| 2 | 영업이익률 | 수익성 판단 핵심 |
| 3 | 매출 성장률 | 성장성 판단 핵심 |
| 4 | 영업이익 성장률 | 성장성 및 수익성 판단 |
| 5 | ROE | 자본 효율성 판단 |
| 6 | PER | 밸류에이션 판단 |
| 7 | PBR | 밸류에이션 판단 |

초기에는 주가 데이터가 필요한 PER, PBR보다 재무제표만으로 계산 가능한 지표를 먼저 구현했다. Phase 16 완료 후 키움 기본정보 API를 연결해 PER, PBR도 추가했다.

---

## Step 7-2. 지표 계산식

| 지표 | 계산식 |
|---|---|
| 부채비율 | 부채총계 / 자본총계 × 100 |
| 영업이익률 | 영업이익 / 매출액 × 100 |
| 매출 성장률 | (올해 매출액 - 전년 매출액) / 전년 매출액 × 100 |
| 영업이익 성장률 | (올해 영업이익 - 전년 영업이익) / 전년 영업이익 × 100 |
| ROE | 당기순이익 / 자본총계 × 100 |
| PER | 주가 / EPS |
| PBR | 주가 / BPS |

---

## Step 7-3. 지표값 저장

사용 테이블:

```text
financial_metric_values
```

저장 데이터:

| 컬럼 | 설명 |
|---|---|
| stock_id | 종목 ID |
| metric_code | PER, ROE, DEBT_RATIO 등 |
| fiscal_year | 사업연도 |
| quarter | 분기 |
| period_type | annual, quarterly |
| metric_value | 계산된 지표값 |
| unit | %, 배, 원 등 |
| previous_value | 이전 기간 값 |
| change_rate | 이전 기간 대비 변화율 |
| source_statement_id | 계산에 사용한 재무제표 |
| calculated_at | 계산 시각 |

완료 기준:

```text
삼성전자의 부채비율, 영업이익률, 매출 성장률 등이 financial_metric_values에 저장된다.
요약분석 화면에서 주요 지표 값을 조회할 수 있다.
```

현재 완료 내용:

```text
backend
- financial_line_items 기반 재무 지표 계산 구현
- financial_metric_values upsert 구현
- 2024 지표 계산 전 2023 비교 데이터 자동 준비
- 삼성전자 지표 계산 worker 추가

계산 구현 완료
- PER (키움 ka10001 최신 밸류에이션 스냅샷)
- PBR (키움 ka10001 최신 밸류에이션 스냅샷)
- DEBT_RATIO
- OPERATING_MARGIN
- REVENUE_GROWTH
- OPERATING_PROFIT_GROWTH
- ROE

docs
- docs/api/financial-metrics.md 추가
```

검증 명령:

```bash
cd backend
npm run financial:metrics:samsung
```

검증 결과:

```text
삼성전자 2024 annual 분석 묶음 지표 7개 저장 완료

metric_value_id=6 PER
- metric_value: 54.92배
- source: 키움 ka10001 최신 스냅샷

metric_value_id=7 PBR
- metric_value: 5.63배
- source: 키움 ka10001 최신 스냅샷

metric_value_id=1 DEBT_RATIO
- metric_value: 27.931898%
- previous_value: 25.359837%
- change_rate: 10.142259%

metric_value_id=2 OPERATING_MARGIN
- metric_value: 10.877077%
- previous_value: 2.536144%
- change_rate: 328.88255%

metric_value_id=5 REVENUE_GROWTH
- metric_value: 16.195311%
- previous_value: 258,935,494,000,000
- change_rate: 16.195311%

metric_value_id=3 OPERATING_PROFIT_GROWTH
- metric_value: 398.341413%
- previous_value: 6,566,976,000,000
- change_rate: 398.341413%

metric_value_id=4 ROE
- metric_value: 8.565895%
- previous_value: 4.258466%
- change_rate: 101.149761%

재실행 시 같은 metric_value_id를 반환해 중복 생성 없이 upsert 동작 확인
```

---

# Phase 8. 규칙 기반 신호등 분석

## Step 8-1. AI 분석 전 규칙 기반 판정 만들기

처음부터 LLM에게 모든 판단을 맡기지 않는다.

분리 기준:

```text
규칙 기반 로직
- 수치 기준으로 green/orange/red 결정
- 점수 계산
- 일관된 결과 생성

LLM
- 결과를 초보자용 문장으로 설명
- 어려운 용어를 쉽게 풀이
- 추가 질문에 답변
```

이렇게 나누면 분석 결과가 더 안정적이고 재현 가능하다.

---

## Step 8-2. 초기 신호등 기준 예시

### 부채비율

| 조건 | 신호 |
|---|---|
| 100% 미만 | green |
| 100% 이상 200% 미만 | orange |
| 200% 이상 | red |

### 영업이익률

| 조건 | 신호 |
|---|---|
| 10% 이상 | green |
| 3% 이상 10% 미만 | orange |
| 3% 미만 또는 적자 | red |

### 매출 성장률

| 조건 | 신호 |
|---|---|
| 10% 이상 | green |
| 0% 이상 10% 미만 | orange |
| 0% 미만 | red |

### 영업이익 성장률

| 조건 | 신호 |
|---|---|
| 10% 이상 | green |
| 0% 이상 10% 미만 | orange |
| 0% 미만 | red |

이 기준은 MVP용 초기 기준이다.  
나중에는 업종 평균, 과거 3년 추세, 분기별 변동성 등을 반영해 개선한다.

---

## Step 8-3. 지표별 분석 결과 저장

사용 테이블:

```text
ai_metric_analysis_items
```

저장 데이터:

| 컬럼 | 설명 |
|---|---|
| analysis_id | AI 분석 실행 ID |
| metric_code | 지표 코드 |
| metric_value | 실제 지표값 |
| industry_avg_value | 업종 평균 |
| previous_value | 이전 기간 값 |
| signal | green, orange, red |
| score | 내부 점수 |
| reason_text | 판단 이유 |
| beginner_explanation | 초보자용 설명 |
| check_point_text | 추가 확인 포인트 |

완료 기준:

```text
부채비율이 100% 미만이면 green으로 저장된다.
영업이익률이 낮으면 orange 또는 red로 저장된다.
각 지표별 판단 이유가 저장된다.
```

현재 완료 내용:

```text
backend
- financial_metric_values 기반 규칙 기반 신호등 분석 구현
- ai_analysis_runs upsert 구현
- ai_metric_analysis_items upsert 구현
- ai_analysis_evidences 저장 구현
- 삼성전자 신호등 분석 worker 추가

docs
- docs/api/traffic-light-analysis.md 추가
```

검증 명령:

```bash
cd backend
npm run analysis:traffic-light:samsung
```

검증 결과:

```text
삼성전자 2024 annual 규칙 기반 분석 저장 완료

analysis_id=1
- overall_signal: green
- overall_score: 81
- summary_text: 삼성전자 2024 annual 재무 신호는 green입니다.

지표별 결과
- DEBT_RATIO: green, score 90
- OPERATING_MARGIN: green, score 85
- OPERATING_PROFIT_GROWTH: green, score 85
- REVENUE_GROWTH: green, score 85
- ROE: orange, score 60

ai_metric_analysis_items 5개 저장
ai_analysis_evidences 5개 저장
```

---

# Phase 9. AI 설명 생성

## Step 9-1. LLM 사용 범위

LLM은 판단 자체보다 설명 생성에 사용한다.

사용 모델:

```text
Google Gemini API
- model: gemini-3-flash-preview
- key: LLM_API_KEY
```

연결 테스트:

```text
2026-06-01 테스트 완료
- gemini-3-flash-preview generateContent 호출 성공
- 응답 문장: "API가 잘 작동합니다."
- 판단: LLM_API_KEY와 모델명 모두 정상 동작 확인
```

LLM이 할 일:

```text
지표별 판단 이유를 초보자용 문장으로 바꾸기
종합 요약 문장 만들기
주의할 점 정리하기
사용자의 추가 질문에 답변하기
```

LLM이 하지 말아야 할 일:

```text
매수 추천
매도 추천
수익률 보장
근거 없는 전망
과도하게 단정적인 표현
```

---

## Step 9-2. AI 종합 분석 저장

사용 테이블:

```text
ai_analysis_runs
```

저장 데이터:

| 컬럼 | 설명 |
|---|---|
| user_id | 분석 요청 사용자 |
| stock_id | 분석 종목 |
| setting_id | 사용한 분석 설정 |
| analysis_type | financial, news, summary, combined |
| overall_signal | green, orange, red |
| overall_score | 내부 점수 |
| summary_text | 초보자용 요약 |
| reason_text | 종합 판단 이유 |
| caution_text | 주의할 점 |
| source_period | 분석 기준 기간 |
| model_name | 사용 모델 |
| prompt_version | 프롬프트 버전 |
| expires_at | 분석 캐시 만료 시각 |

완료 기준:

```text
삼성전자 분석 실행 시 ai_analysis_runs에 종합 결과가 저장된다.
요약분석 화면에서 overall_signal과 summary_text를 표시할 수 있다.
```

현재 완료 내용:

```text
backend
- Gemini API 호출 서비스 구현
- 규칙 기반 분석 결과를 LLM 입력으로 변환
- gemini-3-flash-preview 기반 초보자용 설명 생성
- LLM 결과를 prompt_version=llm-financial-v1 분석 run으로 분리 저장
- LLM 호출 실패 시 rules-v1-fallback으로 규칙 기반 설명 저장
- 삼성전자 LLM 설명 생성 worker 추가

docs
- docs/api/llm-explanation.md 추가
```

검증 명령:

```bash
cd backend
npm run analysis:llm-explanation:samsung
```

검증 결과:

```text
삼성전자 2024 annual LLM 설명 저장 완료

analysis_id=2
- ruleAnalysisId: 1
- model_name: gemini-3-flash-preview
- prompt_version: llm-financial-v1
- overall_signal: green
- overall_score: 81
- summary_text: 삼성전자는 매우 낮은 부채비율과 급격한 이익 성장을 바탕으로 우수한 재무 건전성을 보여줍니다.

ai_metric_analysis_items 5개 저장
ai_analysis_evidences 5개 저장
Gemini finishReason: STOP
```

---

## Step 9-3. 분석 근거 저장

사용 테이블:

```text
ai_analysis_evidences
```

근거 예시:

```text
부채비율 80%로 안정성 양호
영업이익률 7%로 수익성은 보통
매출 성장률 12%로 성장성 양호
```

완료 기준:

```text
AI 분석 결과가 어떤 지표와 데이터에 근거했는지 추적 가능하다.
```

---

# Phase 10. 사용자 분석 설정 구현

## Step 10-1. 분석 설정 프리셋 만들기

사용 테이블:

```text
user_analysis_settings
```

초기 프리셋:

| 설정 | 설명 |
|---|---|
| conservative | 안정성 중심 분석 |
| balanced | 안정성, 성장성, 수익성 균형 |
| growth | 성장성 중심 분석 |

---

## Step 10-2. 가중치 적용

점수 계산 예시:

```text
overall_score =
  stability_score * stability_weight
+ growth_score * growth_weight
+ profitability_score * profitability_weight
+ valuation_score * valuation_weight
+ news_score * news_weight
```

설정별 예시:

| 설정 | stability | growth | profitability | valuation | news |
|---|---:|---:|---:|---:|---:|
| conservative | 0.40 | 0.15 | 0.25 | 0.15 | 0.05 |
| balanced | 0.25 | 0.25 | 0.25 | 0.20 | 0.05 |
| growth | 0.15 | 0.40 | 0.25 | 0.15 | 0.05 |

완료 기준:

```text
사용자가 보수적 분석 / 균형 분석 / 성장성 분석을 선택할 수 있다.
선택한 설정에 따라 종합 신호와 설명이 달라질 수 있다.
```

현재 완료 내용:

```text
- 사용자별 conservative / balanced / growth 프리셋 자동 생성
- GET /api/me/analysis-settings 구현
- PUT /api/me/analysis-settings 구현
- 설정별 가중치를 종합 점수 계산에 반영
- ai_analysis_runs.setting_id 연결
```

---

# Phase 11. 백엔드 API 구현

## Step 11-1. 필수 API 목록

| API | 역할 |
|---|---|
| GET /stocks/search?q=삼성전자 | 종목 검색 |
| GET /stocks/:stockId | 종목 기본 정보 조회 |
| GET /stocks/:stockId/summary | 요약분석 데이터 조회 |
| POST /stocks/:stockId/analyze | 재무 데이터 수집, 지표 계산, AI 분석 실행 |
| GET /stocks/:stockId/financials | 재무상세 데이터 조회 |
| POST /favorites | 관심종목 추가 |
| GET /favorites | 관심종목 목록 |
| DELETE /favorites/:favoriteId | 관심종목 삭제 |
| GET /settings/analysis | 사용자 분석 설정 조회 |
| PUT /settings/analysis | 사용자 분석 설정 수정 |
| POST /chat/sessions | AI 질문 세션 생성 |
| POST /chat/sessions/:id/messages | AI 질문 전송 |

---

## Step 11-2. 핵심 API: 분석 실행

가장 중요한 API:

```http
POST /stocks/:stockId/analyze
```

내부 흐름:

```text
1. stock_id로 종목 확인
2. 최신 AI 분석 결과가 있는지 확인
3. expires_at이 지나지 않았으면 기존 분석 반환
4. 만료됐거나 없으면 재무 데이터 확인
5. 재무 데이터가 없으면 DART 수집
6. 주요 지표 계산
7. 규칙 기반 신호등 분석
8. LLM으로 설명 생성
9. ai_analysis_runs 저장
10. ai_metric_analysis_items 저장
11. ai_analysis_evidences 저장
12. 결과 반환
```

완료 기준:

```text
프론트엔드가 analyze API를 호출하면
재무 수집 → 지표 계산 → 신호등 분석 → AI 설명 → DB 저장 → 결과 반환이 한 번에 동작한다.
```

현재 완료 내용:

```text
- GET /api/stocks/:stockId 구현
- GET /api/stocks/:stockId/summary 구현
- POST /api/stocks/:stockId/analyze 구현
- GET /api/stocks/:stockId/financials 구현
- expires_at 기반 분석 캐시 재사용 구현
- 사용자 설정 기반 개인화 분석 연결
- AI 채팅 세션 생성 / 메시지 저장 / Gemini 답변 구현
```

---

# Phase 12. 요약분석 화면 구현

## Step 12-1. 화면 구성

요약분석 화면은 서비스의 핵심 화면이다.

구성 요소:

```text
종목명
종목 코드
시장 구분
현재가 / 등락률
전체 신호등
AI 요약 문장
주요 지표 카드
지표별 초록/주황/빨강 표시
주가 그래프
관심종목 추가 버튼
AI 질문 입력창
```

초기 MVP에서는 현재가와 주가 그래프는 나중에 붙여도 된다.  
먼저 재무 지표와 신호등 분석을 보여주는 것이 중요하다.

---

## Step 12-2. 사용하는 테이블

```text
stocks
financial_metric_values
ai_analysis_runs
ai_metric_analysis_items
favorite_stocks
stock_prices_daily
```

완료 기준:

```text
삼성전자 요약분석 화면에서 다음 정보가 보인다.

- 종목명: 삼성전자
- 전체 신호등: green/orange/red
- AI 요약 문장
- 부채비율 카드
- 영업이익률 카드
- 매출 성장률 카드
- 각 지표별 판단 색상과 이유
```

현재 완료 내용:

```text
frontend
- HOME 검색 결과 클릭 시 요약분석 화면 전환
- #summary-<stockId> deep-link 진입 지원
- 전체 재무 신호와 종합 점수 표시
- Gemini AI 요약, 핵심 이유, 주의사항 표시
- 주요 지표 카드 5개 표시
- 지표별 green / orange / red 색상 표시
- 관심종목 추가 버튼 연결
- 분석 새로고침 버튼 연결
- AI 추가 질문 입력과 답변 표시 연결
- 데스크톱 / 모바일 반응형 레이아웃 적용

Phase 16 후속 완료
- 현재가 / 등락률: 키움증권 REST API 최근 일봉 데이터 연결
- 주가 그래프: 최근 30거래일 SVG 그래프 연결
- PER / PBR: 키움 ka10001 최신 밸류에이션 스냅샷 연결
```

검증 결과:

```text
Chrome headless 데스크톱 화면 확인
- HOME 검색 화면 정상
- 삼성전자 요약분석 화면 정상
- AI 요약 문장과 주요 지표 카드 5개 렌더링 확인

Chrome headless 모바일 화면 확인
- 상단 버튼 줄바꿈 문제 수정
- 요약 신호, AI 설명, 지표 카드가 겹침 없이 표시됨

DOM 확인
- 삼성전자 요약분석
- 낮은 부채비율 기반 AI 요약
- 부채비율 카드
- AI에게 추가 질문 영역
```

---

# Phase 13. 재무상세 화면 구현

## Step 13-1. 화면 구성

재무상세 화면은 사용자가 “왜 이런 색이 나왔는지” 확인하는 화면이다.

구성 요소:

```text
지표명
지표값
초록/주황/빨강 신호
지표의 쉬운 설명
판단 이유
전년 대비 변화
업종 평균 비교
추가 확인 포인트
```

---

## Step 13-2. 사용하는 테이블

```text
metric_definitions
financial_metric_values
ai_metric_analysis_items
industry_metric_benchmarks
```

초기에는 업종 평균이 없어도 된다.  
없을 경우 다음과 같이 표시한다.

```text
업종 평균 데이터는 아직 준비되지 않았습니다.
현재 분석은 전년 대비 변화와 현재 재무 상태를 기준으로 판단했습니다.
```

완료 기준:

```text
사용자가 부채비율 카드를 클릭하면
부채비율의 의미, 현재 값, 신호 색상, 판단 이유를 볼 수 있다.
```

현재 완료 내용:

```text
frontend
- 주요 재무 지표 카드를 클릭 가능한 UI로 변경
- 선택 카드 활성 상태 표시
- 지표 상세 패널 구현
- 현재 값, 이전 기간 값, 업종 평균 표시
- 쉬운 설명, 판단 이유, 전년 대비 변화, 추가 확인 포인트 표시
- 업종 평균 데이터가 없으면 안내 문구 표시
- 성장률 지표는 이전 매출액/영업이익 금액을 구분해 표시
- 상세 패널 닫기 구현
- 모바일 반응형 레이아웃 적용
```

검증 결과:

```text
Chrome 원격 디버깅 카드 클릭 검증
- 부채비율 카드 클릭 시 상세 패널 표시
- 현재 값: 27.93%
- 이전 기간 값: 25.36%
- 업종 평균: 준비 중
- 선택 카드 active 상태: 1개

성장률 카드 비교 검증
- 매출 성장률 상세에서 이전 매출액 원 단위 표시
- 상세 닫기 후 패널 hidden, active 카드 0개 확인

Chrome 모바일 화면 확인
- 상세 패널이 1열로 표시됨
- 텍스트 겹침 없음
```

---

# Phase 14. 관심종목 기능 구현

## Step 14-1. 관심종목 추가/삭제

사용 테이블:

```text
favorite_stocks
```

기능:

```text
관심종목 추가
관심종목 삭제
관심종목 정렬
관심종목별 메모
```

완료 기준:

```text
요약분석 화면에서 삼성전자를 관심종목에 추가할 수 있다.
관심종목 화면에서 삼성전자를 확인할 수 있다.
```

---

## Step 14-2. 관심종목 화면

사용 테이블 또는 뷰:

```text
favorite_stocks
latest_ai_analysis_per_stock
favorite_stocks_with_latest_analysis
```

화면 구성:

```text
종목명
종목 코드
최근 전체 신호
AI 한 줄 요약
주의할 점
관심종목 추가일
```

완료 기준:

```text
관심종목 목록에서 각 종목의 최신 AI 신호를 확인할 수 있다.
```

현재 완료 내용:

```text
backend
- GET /api/me/favorite-stocks 응답에 종목별 최신 재무 분석 결합
- PATCH /api/me/favorite-stocks/:favoriteId 구현
- 로그인 사용자 소유 조건으로 메모와 display_order 수정
- 종목 ID, 관심종목 ID, 메모 길이, 정렬 순서 입력 검증

frontend
- HOME 관심종목 목록 화면 구현
- 종목명, 종목 코드, 최신 전체 신호, AI 요약, 주의점, 추가일 표시
- 요약분석 화면 관심종목 추가/삭제 토글 구현
- 관심종목 목록에서 요약분석 화면 이동
- 관심종목 삭제, 메모 저장, 위아래 정렬 구현
- 데스크톱과 모바일 반응형 레이아웃 적용
```

검증 결과:

```text
node --check
- backend 관심종목 repository, service, route 통과
- frontend API, 화면 스크립트 통과

로컬 백엔드 검증
- GET /api/health 통과
- GET /api/health/db 통과
- 인증 없는 PATCH /api/me/favorite-stocks/:favoriteId 요청 차단 확인
- 잘못된 관심종목 ID, 500자 초과 메모, 음수 정렬 순서 차단 확인

Chrome 원격 디버깅 자동 클릭 검증
- 관심종목 2개 렌더링
- 최신 신호 양호, 확인 필요 표시
- 메모 저장 PATCH 요청 확인
- 정렬 순서 변경 PATCH 요청 확인
- 삼성전자 상세 이동 후 관심종목 삭제 토글 확인
- 데스크톱과 모바일 화면 텍스트 겹침 없음
```

---

# Phase 15. AI 추가 질문 기능 구현

## Step 15-1. 채팅 세션 생성

사용 테이블:

```text
ai_chat_sessions
ai_chat_messages
```

처리 흐름:

```text
1. 사용자가 요약분석 화면에서 질문을 입력한다.
2. 해당 종목 기준으로 chat_session을 생성한다.
3. 사용자 질문을 ai_chat_messages에 저장한다.
4. 최근 AI 분석 결과와 재무 지표를 context로 구성한다.
5. LLM에 질문을 전달한다.
6. AI 답변을 ai_chat_messages에 저장한다.
7. 화면에 답변을 표시한다.
```

---

## Step 15-2. AI 질문 context 구성

LLM에 전달할 정보:

```text
종목명
최근 AI 종합 분석 결과
지표별 값
지표별 신호등 판단
지표별 판단 이유
metric_definitions의 초보자용 설명
사용자의 분석 설정
```

질문 예시:

```text
이 회사 위험해?
PER이 높으면 안 좋은 거야?
부채비율은 괜찮은 편이야?
영업이익률이 낮으면 무슨 뜻이야?
```

완료 기준:

```text
사용자 질문과 AI 답변이 DB에 저장된다.
AI 답변은 해당 종목의 실제 분석 결과를 참고한다.
매수/매도 추천은 하지 않는다.
```

현재 완료 내용:

```text
backend
- GET /api/me/chat-sessions?stockId=:stockId 종목별 세션 조회 구현
- Gemini context에 종목, 최신 분석, 지표, 사용자 분석 설정 포함
- metric_definitions 초보자 설명과 최근 대화 메시지 포함
- 직접적인 매수, 매도, 보유 지시가 포함되면 fallback 답변 사용
- 종목 ID, 설정 ID, 세션 ID, 제목 길이, 질문 타입·길이 입력 검증

frontend
- 질문 예시 버튼 4개 구현
- 종목별 이전 질문 세션 목록 구현
- 이전 질문 선택 시 저장된 사용자 질문과 AI 답변 복원
- 새 대화 초기화 구현
- 질문 전송 후 신규 세션과 AI 답변 표시
- 데스크톱과 모바일 반응형 대화 UI 적용
```

검증 결과:

```text
node --check
- backend AI 분석 repository, 사용자 데이터 repository, chat service, route 통과
- frontend API, 화면 스크립트 통과

입력 검증
- 0 또는 잘못된 종목·설정 ID 차단
- 200자 초과 세션 제목 차단
- 문자열이 아닌 질문 차단
- 1000자 초과 질문 차단

Chrome 원격 디버깅 자동 클릭 검증
- 이전 세션 2개와 질문 예시 4개 렌더링
- 이전 질문 선택 후 저장 메시지 2개 복원
- 새 대화 후 메시지 영역 초기화
- 질문 예시 선택 후 입력값 반영
- 신규 세션 POST와 메시지 POST 요청 확인
- 신규 AI 답변 표시와 active 세션 갱신 확인
- 데스크톱과 모바일 화면 텍스트 겹침 없음
```

---

# Phase 16. 주가 그래프 기능 구현

## Step 16-1. 주가 데이터 저장 전략

500MB DB 제한을 고려해 주가 데이터는 다음처럼 나눈다.

주가 데이터 공급원:

```text
키움증권 REST API
- STOCK_APP_KEY
- STOCK_SECRET_KEY

두 키는 .env에만 저장하고 백엔드에서만 사용한다.
프론트엔드에는 키움 API 키를 직접 노출하지 않는다.
```

```text
DB 저장
- 최근 30일 또는 90일 일별 주가
- 요약 화면 그래프용 데이터

로컬 파일 저장
- 1년 이상 장기 주가 데이터
- 전체 일별 주가 파일
```

사용 테이블:

```text
stock_prices_daily
stock_price_cache_ranges
external_data_cache_files
```

---

## Step 16-2. 최근 주가 그래프 표시

차트에 필요한 데이터:

```text
trade_date
close_price
volume
change_rate
```

완료 기준:

```text
요약분석 화면에서 삼성전자 최근 30일 종가 그래프가 표시된다.
장기 데이터는 로컬 파일 캐시에서 관리된다.
```

현재 완료 내용:

```text
backend
- 키움 OAuth 접근 토큰 발급 연결
- 키움 주식일봉차트조회요청(ka10081) 연결
- 삼성전자 수집 worker 추가: npm run prices:collect:samsung
- 키움 원본 응답을 data-cache/prices/005930/daily.json에 저장
- external_data_cache_files, stock_price_cache_ranges 메타데이터 연결
- 최근 90거래일을 stock_prices_daily에 upsert
- GET /api/stocks/:stockId/prices?days=30 구현

frontend
- 요약분석 화면 최근 주가 영역 추가
- 최근 종가, 등락률, 거래량 표시
- 최근 30거래일 종가 반응형 SVG 그래프 표시
- 수집 데이터가 없을 때 안내 문구 표시

docs
- docs/api/stock-prices.md 추가
```

실제 키움 수집 전 준비:

```text
프로젝트 루트 .env에 STOCK_APP_KEY, STOCK_SECRET_KEY를 저장한다.
키움 REST API 관리 화면에 백엔드 실행 환경의 공인 IP가 등록되어 있어야 한다.
```

검증 결과:

```text
2026-06-02 삼성전자 실전 키움 REST API 일봉 수집 성공
- ka10081 원본 일봉 600건 로컬 JSON 저장
- data-cache/prices/005930/daily.json 생성
- stock_prices_daily 최근 90거래일 저장
- stock_price_cache_ranges 2023-12-11 ~ 2026-06-02 범위 저장
- GET /api/stocks/1/prices?days=30 응답 30건 확인
- 최신 데이터: 2026-06-02 종가 360,500원, 등락률 +3.2951%, 거래량 43,102,071주
- worker 재실행 시 metadata_cache 재사용 확인
```

Phase 16 후속 완료:

```text
2026-06-02 키움 주식기본정보요청(ka10001) 연결
- data-cache/prices/005930/basic-info.json 생성
- 현재가 360,500원, PER 54.92배, EPS 6,564원, PBR 5.63배, BPS 63,976원 확인
- financial_metric_values에 PER, PBR 저장
- 신호등 분석 지표를 5개에서 7개로 확장
- Gemini 설명 재생성 완료
- 업종 평균이 없는 MVP 단계에서는 PER 15/30배, PBR 1.5/3배를 참고 기준으로 사용
```

---

# Phase 17. 뉴스 분석 기능 구현

## Step 17-1. 뉴스 수집

뉴스 분석은 재무 분석 MVP가 완성된 뒤 추가한다.

사용 테이블:

```text
news_articles
stock_news
news_ai_analyses
```

처리 흐름:

```text
1. 종목명 또는 키워드로 뉴스 검색
2. 뉴스 제목, 요약, URL, 언론사, 발행일 저장
3. 뉴스 원문 또는 전체 응답은 로컬 파일로 저장
4. 종목과 뉴스의 관련도 계산
5. stock_news에 연결 정보 저장
```

---

## Step 17-2. 뉴스 AI 분석

AI가 분석할 내용:

```text
호재 / 악재 / 중립
단기 영향 / 중기 영향 / 장기 영향
왜 그렇게 판단했는지
확인해야 할 리스크 키워드
```

완료 기준:

```text
삼성전자 최근 뉴스 5개가 표시된다.
각 뉴스가 positive / neutral / negative로 분류된다.
각 뉴스별 영향 설명이 표시된다.
```

현재 완료 내용:

```text
backend
- 네이버 비로그인 검색 API 뉴스 엔드포인트 연결
- NAVER_CLIENT_ID, NAVER_CLIENT_SECRET 백엔드 전용 환경변수 사용
- 삼성전자 최근 뉴스 수집 worker 추가: npm run news:collect:samsung
- 네이버 원본 응답을 data-cache/news/005930/YYYY-MM-DD.json에 저장
- external_data_cache_files news_raw 메타데이터 연결
- news_articles 기사 메타데이터 upsert
- stock_news 종목 관련도와 매칭 키워드 저장
- Gemini 뉴스 묶음 분석 연결
- news_ai_analyses에 감성, 영향 신호, 영향 기간, 이유, 리스크 키워드 저장
- Gemini 실패 시 키워드 기반 임시 분류 fallback
- 유효한 원본 캐시와 기존 llm-news-v1 분석 재사용
- GET /api/stocks/:stockId/news?limit=5 구현
- POST /api/stocks/:stockId/news/refresh 구현

frontend
- 요약분석 화면 최근 뉴스 분석 영역 추가
- 긍정 / 부정 / 중립 / 혼합 배지 표시
- AI 영향 요약, 판단 이유, 확인 키워드 표시
- 기사 원문 링크 표시
- 뉴스 갱신 버튼 연결

docs
- docs/api/news.md 추가
```

검증 결과:

```text
2026-06-02 삼성전자 네이버 뉴스 검색 API 실 수집 성공
- 최근 뉴스 5건 저장
- Gemini 뉴스 영향 분석 5건 저장
- positive 2건, mixed 1건, neutral 2건 확인
- data-cache/news/005930/2026-06-02.json 생성
- GET /api/stocks/1/news?limit=5 응답 5건 확인
- worker 재실행 시 metadata_cache와 기존 llm-news-v1 분석 재사용
```

---

# Phase 18. 캐시 만료 정책 구현

구현 완료:

```text
cachePolicy.js에 데이터별 TTL 중앙화
DART 원본: 30일
키움 일봉 및 종목 기본정보: 1일
네이버 뉴스 검색 원본: 6시간
재무 신호등 및 LLM 설명: 7일
기존 재무 AI 결과도 생성 시각 기준 7일 상한 적용
정상 조회 시 external_data_cache_files.expires_at 기준으로 재수집 여부 판단
Supabase 메타데이터 조회 장애 시에만 파일 수정 시각 TTL 기준 로컬 캐시 임시 사용
npm run cache:policy:check 정책 assertion 및 삼성전자 캐시 상태 점검 worker 추가
```

## Step 18-1. 데이터별 저장 위치와 갱신 주기

| 데이터 | 저장 위치 | 갱신 주기 |
|---|---|---|
| 종목 마스터 | DB | 수동 또는 일 1회 |
| 재무제표 원본 | 로컬 파일 | 분기/사업보고서 기준 |
| 주요 재무 지표 | DB | 재무제표 갱신 시 |
| AI 분석 결과 | DB | 1일 ~ 7일 |
| 최근 주가 | DB | 일 1회 |
| 장기 주가 | 로컬 파일 | 일 1회 |
| 뉴스 메타데이터 | DB | 1시간 ~ 1일 |
| 뉴스 원문 | 로컬 파일 | 필요 시 |

---

## Step 18-2. 캐시 사용 흐름

```text
요청 발생
→ DB에서 캐시 메타데이터 확인
→ 로컬 파일 존재 확인
→ expires_at 확인
→ 유효하면 캐시 사용
→ 만료되었으면 외부 API 호출
→ 새 원본 파일 저장
→ DB 메타데이터 갱신
→ 분석 결과 반환
```

완료 기준:

```text
같은 종목을 반복 분석해도 매번 DART API나 LLM API를 호출하지 않는다.
만료된 데이터만 새로 수집한다.
```

---

# Phase 19. 테스트 전략

## Step 19-1. 1개 종목 기준 테스트

첫 번째 테스트 종목:

```text
삼성전자
```

테스트 항목:

```text
종목 검색 가능
검색 기록 저장
재무제표 수집 가능
로컬 캐시 저장 가능
주요 재무 항목 저장 가능
재무 지표 계산 가능
신호등 분석 가능
AI 설명 생성 가능
요약분석 화면 표시 가능
재무상세 화면 표시 가능
관심종목 추가 가능
AI 질문 가능
```

---

## Step 19-2. 5개 종목 확장 테스트

테스트 종목:

```text
삼성전자
SK하이닉스
현대차
NAVER
카카오
```

확인 사항:

```text
종목마다 재무 데이터 수집이 정상 동작하는지
기업별 지표 계산이 깨지지 않는지
AI 분석 결과가 종목별로 다르게 나오는지
관심종목 목록에서 최신 신호가 보이는지
캐시가 정상 재사용되는지
```

---

# Phase 20. 발표용 데모 시나리오

한 학기 프로젝트에서는 데모 흐름이 중요하다.

추천 데모:

```text
1. 사용자가 로그인한다.
2. HOME에서 삼성전자를 검색한다.
3. 검색 결과에서 삼성전자를 선택한다.
4. 요약분석 화면으로 이동한다.
5. 주요 지표가 초록/주황/빨강으로 표시된다.
6. AI 요약 문장을 확인한다.
7. 부채비율 또는 영업이익률 상세 설명을 확인한다.
8. AI에게 "이 회사 위험해?"라고 질문한다.
9. AI가 매수/매도가 아닌 해석 중심 답변을 한다.
10. 삼성전자를 관심종목에 추가한다.
11. 관심종목 화면에서 삼성전자의 최근 신호를 확인한다.
```

데모에서 강조할 차별점:

```text
단순히 숫자를 보여주는 것이 아니다.
초보자가 이해하기 쉬운 언어로 해석한다.
AI가 매수/매도를 대신하지 않는다.
각 판단에는 이유가 있다.
대용량 원본 데이터는 로컬 캐시로 관리해 DB 용량을 아낀다.
```

---

# 최종 구현 체크리스트

## A. DB / 데이터

- [x] DB 테이블 생성
- [x] metric seed 입력
- [ ] 테스트 종목 5개 입력
- [x] stock_aliases 입력 (삼성전자 기준)
- [x] DART 원본 캐시 저장 (삼성전자 2023/2024 annual 기준)
- [x] financial_statement_snapshots 저장 (삼성전자 2024 annual 기준)
- [x] financial_line_items 저장 (삼성전자 2023/2024 annual 기준)
- [x] financial_metric_values 계산 및 저장 (삼성전자 2024 annual 분석 묶음 7개, PER/PBR 최신 스냅샷 포함)
- [x] ai_analysis_runs 저장 (규칙 기반 + LLM 설명 삼성전자 2024 annual 기준)
- [x] ai_metric_analysis_items 저장 (규칙 기반 + LLM 설명 삼성전자 2024 annual 기준)
- [x] ai_analysis_evidences 저장 (규칙 기반 + LLM 설명 삼성전자 2024 annual 기준)
- [x] news_articles, stock_news 저장 (삼성전자 네이버 뉴스 5건 기준)
- [x] news_ai_analyses 저장 (Gemini 뉴스 영향 분석 5건 기준)

## B. 백엔드

- [x] Supabase 연결
- [x] 종목 검색 API
- [x] 검색 기록 저장 API
- [x] DART 수집 서비스
- [x] 로컬 캐시 관리 서비스
- [x] 재무 지표 계산 서비스
- [x] 신호등 분석 서비스
- [x] LLM 설명 생성 서비스
- [x] 사용자 분석 설정 API
- [x] 요약분석 조회 API
- [x] 재무상세 조회 API
- [x] 관심종목 API (사용자별 기본 데이터 보호 기준)
- [x] AI 질문 API (백엔드 기본 흐름)
- [x] 네이버 뉴스 수집 API
- [x] 뉴스 Gemini 영향 분석 API

## C. 프론트엔드

- [x] 로그인 화면
- [x] HOME 검색 화면
- [x] 검색 결과 목록
- [x] 요약분석 화면
- [x] 주요 지표 카드
- [x] 신호등 표시 UI
- [x] 재무상세 화면
- [x] 관심종목 화면
- [x] AI 질문 UI (이전 질문, 예시 질문, 신규 대화 포함)
- [x] 주가 그래프
- [x] 뉴스 분석 화면

## D. 캐시 / 성능

- [x] data-cache 폴더 구조 생성
- [x] DART 원본 JSON 저장
- [x] 주가 장기 데이터 파일 저장 (삼성전자 키움 일봉 600건 기준)
- [x] 네이버 뉴스 검색 원본 JSON 저장 (삼성전자 최근 뉴스 기준)
- [x] 캐시 메타데이터 DB 저장
- [x] expires_at 기반 재수집 여부 판단
- [x] 같은 요청 반복 시 캐시 재사용
- [x] 데이터별 TTL 중앙 정책 적용
- [x] DB 메타데이터 조회 장애 시 로컬 파일 TTL 대체 사용

## E. 발표 준비

- [x] 삼성전자 데모 데이터 준비 (재무제표/주요 항목/지표 기준)
- [x] 데모용 AI 분석 결과 준비 (규칙 기반 신호등 + Gemini 설명 기준)
- [ ] 발표용 사용자 시나리오 정리
- [x] DB 구조 설명 자료 준비
- [x] 캐싱 구조 설명 자료 준비
- [ ] 한계점 및 확장 방향 정리

---

# 바로 다음 작업

현재 상태에서 가장 먼저 해야 할 일은 **Phase 19. 삼성전자 전체 데모 흐름 검증 및 테스트 종목 확장 준비**다.

바로 다음 순서:

```text
1. 삼성전자 전체 데모 흐름 검증
2. 발표용 사용자 시나리오 정리
3. 한계점 및 확장 방향 정리
4. 테스트 종목 5개 확장 준비
```

삼성전자 기준 검색, 재무, 주가, 뉴스, AI 설명 흐름은 연결 완료했다.

---

# 권장 마일스톤

## Milestone 1. 검색 가능한 서비스

목표:

```text
로그인 후 HOME에서 종목을 검색하고 요약분석 화면으로 이동
```

포함 기능:

```text
로그인
종목 마스터 입력
종목 검색
검색 기록 저장
기본 요약분석 화면 라우팅
```

---

## Milestone 2. 재무 데이터가 들어오는 서비스

목표:

```text
DART에서 재무제표를 가져와 DB와 로컬 캐시에 저장
```

포함 기능:

```text
DART API 연동
원본 JSON 로컬 저장
재무제표 스냅샷 저장
주요 계정 항목 저장
```

---

## Milestone 3. 지표를 계산하는 서비스

목표:

```text
재무제표에서 주요 지표를 계산하고 DB에 저장
```

포함 기능:

```text
부채비율 계산
영업이익률 계산
매출 성장률 계산
영업이익 성장률 계산
ROE 계산
financial_metric_values 저장
```

---

## Milestone 4. AI 신호등 분석 서비스

목표:

```text
각 지표를 초록/주황/빨강으로 분석하고 이유를 설명
```

포함 기능:

```text
규칙 기반 신호등 판정
AI 요약 생성
지표별 설명 생성
AI 분석 결과 저장
요약분석 화면 표시
```

---

## Milestone 5. 사용자가 다시 찾는 서비스

목표:

```text
관심종목과 AI 질문 기능으로 사용자 경험 완성
```

포함 기능:

```text
관심종목 추가/삭제
관심종목별 최신 신호 표시
AI 질문 세션
AI 답변 저장
```

---

## Milestone 6. 확장 기능

목표:

```text
주가 그래프와 뉴스 분석 추가
```

포함 기능:

```text
최근 주가 그래프
장기 주가 로컬 캐시
뉴스 수집
뉴스 호재/악재/중립 분석
```

---

# 구현 우선순위 요약

```text
1. 종목 마스터 + 검색
2. DART 재무 데이터 수집
3. 재무 지표 계산
4. 신호등 분석
5. AI 설명 생성
6. 요약분석 화면
7. 재무상세 화면
8. 관심종목
9. AI 질문
10. 주가 그래프
11. 뉴스 분석
```

이 순서대로 구현하면 프로젝트 범위가 커져도 핵심 MVP를 안정적으로 완성할 수 있다.
