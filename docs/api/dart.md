# DART Financial Collection

Step 6-1은 DART 재무제표 원본 응답을 로컬 캐시에 저장하고 `external_data_cache_files`에 메타데이터를 남기는 단계다.

구현 파일:

```text
backend/src/services/dartFinancialService.js
backend/src/workers/collectSamsungDartFinancials.js
```

재사용한 기존 로직:

```text
stock-details.js에서 사용하던 DART API 엔드포인트
fnlttSinglAcntAll.json
reprt_code=11011
fs_div=CFS
status !== '000' 응답 처리
```

검증 명령:

```bash
cd backend
npm run dart:collect:samsung
```

연도와 보고서 유형을 지정할 수도 있다.

```bash
npm run dart:collect:samsung -- 2024 annual
npm run dart:collect:samsung -- 2024 q1
npm run dart:collect:samsung -- 2024 q2
npm run dart:collect:samsung -- 2024 q3
```

처리 흐름:

```text
1. stock_id=1로 삼성전자 종목을 조회한다.
2. stocks.dart_corp_code를 확인한다.
3. logical_key로 fresh cache metadata를 확인한다.
4. 유효한 DB metadata와 로컬 파일이 있으면 파일을 읽는다.
5. DB metadata 조회가 실패해도 로컬 파일이 유효하면 파일 캐시를 사용한다.
6. 캐시가 없으면 DART API를 호출한다.
7. 원본 응답 JSON을 data-cache/dart/005930/<year>/<report>.json에 저장한다.
8. external_data_cache_files에 file_path, byte_size, content_hash, expires_at을 저장한다.
```

현재 저장 위치:

```text
data-cache/dart/005930/2024/annual.json
```
