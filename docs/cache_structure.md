# Local Cache Structure

대용량 원본 데이터는 DB에 직접 저장하지 않고 `data-cache` 아래 로컬 파일로 관리한다.

삼성전자(`005930`) 기준 폴더와 키움 일봉 JSON 캐시를 사용한다.

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

예정 파일:

```text
data-cache/dart/005930/2024/annual.json
data-cache/dart/005930/2024/q1.json
data-cache/dart/005930/2024/q2.json
data-cache/dart/005930/2024/q3.json
data-cache/prices/005930/daily.json
data-cache/news/005930/2026-05-18.json
data-cache/llm/analysis/005930/2026-05-18-summary.json
```

실제 캐시 파일은 `.gitignore`에 의해 Git에 올라가지 않는다. 폴더 구조 유지를 위해 `.gitkeep`만 커밋한다.

키움 일봉 캐시:

```text
data-cache/prices/005930/daily.json
- 키움 REST API ka10081 원본 페이지 응답
- external_data_cache_files.cache_type=price_daily
- stock_price_cache_ranges에 파일의 일별 범위 저장
- 최근 90거래일은 stock_prices_daily에 별도 저장
```

Step 5-2부터 캐시 파일을 저장하면 `external_data_cache_files`에는 아래 정보만 기록한다.

```text
logical_key
file_path
file_format
content_hash
byte_size
period_start
period_end
expires_at
metadata
```

검증용 명령:

```bash
cd backend
npm run cache:demo:samsung-dart
```
