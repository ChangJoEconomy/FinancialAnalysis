# Local Cache Structure

대용량 원본 데이터는 DB에 직접 저장하지 않고 `data-cache` 아래 로컬 파일로 관리한다.

현재 Step 5-1에서는 삼성전자(`005930`) 기준 폴더만 준비했다.

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
data-cache/prices/005930/daily.csv
data-cache/prices/005930/daily.parquet
data-cache/prices/005930/meta.json
data-cache/news/005930/2026-05-18.json
data-cache/llm/analysis/005930/2026-05-18-summary.json
```

실제 캐시 파일은 `.gitignore`에 의해 Git에 올라가지 않는다. 폴더 구조 유지를 위해 `.gitkeep`만 커밋한다.

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
