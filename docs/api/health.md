# Backend Health API

## GET /api/health

백엔드 프로세스 실행 여부를 확인한다.

## GET /api/health/db

Supabase REST API로 `metric_definitions` 테이블에 접근해 DB 연결을 확인한다.

필요 환경변수:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```
