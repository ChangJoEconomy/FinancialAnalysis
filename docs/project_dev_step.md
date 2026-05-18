# AI 주식 분석 서비스 프로젝트 진행 단계

> 현재 상태: **Supabase PostgreSQL 테이블 생성 완료 + metric seed 입력 완료 + 프로젝트 폴더 구조 정리 완료 + 삼성전자 종목 마스터 입력 완료 + 종목 검색 API 구현 완료 + 검색 기록 저장 구현 완료 + HOME 화면 구현 완료**  
> 다음 목표: **종목 검색 → 재무 데이터 수집 → 지표 계산 → AI 신호등 분석 → 화면 표시**까지 MVP 흐름 완성

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
STOCK_API_KEY=
NEWS_API_KEY=
LLM_API_KEY=

DATA_CACHE_ROOT=./data-cache
```

주의사항:

```text
SUPABASE_SERVICE_ROLE_KEY는 절대 프론트엔드에 노출하지 않는다.
DART_API_KEY, NEWS_API_KEY, LLM_API_KEY도 백엔드에서만 사용한다.
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

초기에는 주가 데이터가 필요한 PER, PBR보다 재무제표만으로 계산 가능한 지표를 먼저 구현한다.

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

---

# Phase 9. AI 설명 생성

## Step 9-1. LLM 사용 범위

LLM은 판단 자체보다 설명 생성에 사용한다.

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

---

# Phase 16. 주가 그래프 기능 구현

## Step 16-1. 주가 데이터 저장 전략

500MB DB 제한을 고려해 주가 데이터는 다음처럼 나눈다.

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

---

# Phase 18. 캐시 만료 정책 구현

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
- [ ] stock_aliases 입력
- [ ] DART 원본 캐시 저장
- [ ] financial_statement_snapshots 저장
- [ ] financial_line_items 저장
- [ ] financial_metric_values 계산 및 저장
- [ ] ai_analysis_runs 저장
- [ ] ai_metric_analysis_items 저장
- [ ] ai_analysis_evidences 저장

## B. 백엔드

- [ ] Supabase 연결
- [ ] 종목 검색 API
- [ ] 검색 기록 저장 API
- [ ] DART 수집 서비스
- [ ] 로컬 캐시 관리 서비스
- [ ] 재무 지표 계산 서비스
- [ ] 신호등 분석 서비스
- [ ] LLM 설명 생성 서비스
- [ ] 요약분석 조회 API
- [ ] 재무상세 조회 API
- [ ] 관심종목 API
- [ ] AI 질문 API

## C. 프론트엔드

- [ ] 로그인 화면
- [ ] HOME 검색 화면
- [ ] 검색 결과 목록
- [ ] 요약분석 화면
- [ ] 주요 지표 카드
- [ ] 신호등 표시 UI
- [ ] 재무상세 화면
- [ ] 관심종목 화면
- [ ] AI 질문 UI
- [ ] 주가 그래프
- [ ] 뉴스 분석 화면

## D. 캐시 / 성능

- [ ] data-cache 폴더 구조 생성
- [ ] DART 원본 JSON 저장
- [ ] 주가 장기 데이터 파일 저장
- [ ] 캐시 메타데이터 DB 저장
- [ ] expires_at 기반 재수집 여부 판단
- [ ] 같은 요청 반복 시 캐시 재사용

## E. 발표 준비

- [ ] 삼성전자 데모 데이터 준비
- [ ] 데모용 AI 분석 결과 준비
- [ ] 발표용 사용자 시나리오 정리
- [ ] DB 구조 설명 자료 준비
- [ ] 캐싱 구조 설명 자료 준비
- [ ] 한계점 및 확장 방향 정리

---

# 바로 다음 작업

현재 상태에서 가장 먼저 해야 할 일은 **종목 마스터 데이터 입력과 검색 기능 구현**이다.

바로 다음 순서:

```text
1. stocks에 삼성전자 넣기
2. stock_aliases에 삼성전자 / 삼전 / 005930 넣기
3. 검색 API 만들기
4. HOME 검색창에서 삼성전자 검색되게 만들기
5. 검색 결과 클릭 시 stock_search_histories에 저장하기
6. 요약분석 페이지로 이동시키기
```

이 단계가 끝나면 다음으로 DART 재무 데이터 수집과 지표 계산을 연결한다.

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
