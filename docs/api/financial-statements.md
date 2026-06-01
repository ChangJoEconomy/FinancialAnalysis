# Financial Statement Snapshots

Step 6-2는 DART 원본 캐시를 기준으로 `financial_statement_snapshots`에 재무제표 스냅샷 메타데이터를 저장한다.

구현 파일:

```text
backend/src/services/financialSnapshotService.js
backend/src/repositories/financialStatementRepository.js
backend/src/workers/saveSamsungFinancialSnapshots.js
```

검증 명령:

```bash
cd backend
npm run financial:snapshot:samsung
```

저장 대상:

```text
BS -> balance_sheet
IS -> income_statement
CF -> cash_flow
```

현재는 Step 6-2 완료 기준에 맞춰 삼성전자 2024년 annual 기준 3개 스냅샷을 저장한다.
