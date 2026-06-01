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
backend/src/repositories/cacheMetadataRepository.js
backend/src/utils/cachePaths.js
```

검증 명령:

```bash
cd backend
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

Step 5-2 검증용 파일:

```text
data-cache/dart/005930/2024/annual.json
```

이 파일은 실제 DART 응답이 아니라 캐시 메타데이터 저장 흐름을 확인하기 위한 smoke-test payload다. 실제 DART API 응답 저장은 Step 6에서 같은 서비스 레이어를 사용한다.
