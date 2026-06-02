# Cache Metadata

로컬 캐시 파일은 `data-cache`에 저장하고, DB에는 파일 경로와 상태만 저장한다.

사용 테이블:

```text
external_data_cache_files
stock_price_cache_ranges
```

현재 구현:

```text
backend/src/services/cacheMetadataService.js
backend/src/services/cachePolicy.js
backend/src/repositories/cacheMetadataRepository.js
backend/src/utils/cachePaths.js
```

## 만료 정책

| 데이터 | cache_type | TTL |
|---|---|---|
| DART 재무제표 원본 | `dart_raw` | 30일 |
| 키움 일봉 원본 | `price_daily` | 1일 |
| 키움 종목 기본정보 | `stock_basic_info` | 1일 |
| 네이버 뉴스 검색 원본 | `news_raw` | 6시간 |
| 재무 신호등 및 LLM 설명 | `financial_analysis` | 7일 |

뉴스 기사별 Gemini 영향 분석은 기사 URL과 `prompt_version`이 같으면 재사용한다. 새로운 뉴스 수집 또는 강제 갱신 시 새 결과를 저장한다.

재무 신호등 및 LLM 설명은 `expires_at`과 생성 시각 기준 7일 상한을 함께 확인한다. Phase 18 이전에 더 긴 만료일로 저장된 결과도 7일이 지나면 재분석한다.

검증 명령:

```bash
cd backend
npm run cache:policy:check
npm run cache:demo:samsung-dart
```

처리 흐름:

```text
1. logical_key로 아직 유효한 캐시 메타데이터가 있는지 확인한다.
2. 유효한 캐시가 있으면 API를 호출하지 않고 cacheHit=true를 반환한다.
3. 유효한 캐시가 없으면 로컬 JSON 파일을 저장한다.
4. 파일 크기와 SHA-256 content_hash를 계산한다.
5. external_data_cache_files에 파일 경로와 메타데이터를 upsert한다.
```

Supabase 메타데이터 조회에 성공한 경우에는 DB의 `expires_at`이 지난 로컬 파일을 사용하지 않는다. 메타데이터 조회 자체가 실패한 로컬 개발 상황에서만 파일 수정 시각이 TTL 안에 있는 JSON 파일을 임시 대체 캐시로 사용한다.

Step 5-2 검증용 파일:

```text
data-cache/dart/005930/2024/annual.json
```

이 파일은 실제 DART 응답이 아니라 캐시 메타데이터 저장 흐름을 확인하기 위한 smoke-test payload다. 실제 DART API 응답 저장은 Step 6에서 같은 서비스 레이어를 사용한다.
