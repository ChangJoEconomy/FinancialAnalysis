# Financial Line Items

Step 6-3은 DART 원본 캐시에서 서비스에 필요한 주요 계정을 추출해 `financial_line_items`에 저장한다.

구현 파일:

```text
backend/src/services/financialLineItemService.js
backend/src/repositories/financialStatementRepository.js
backend/src/workers/saveSamsungFinancialLineItems.js
```

검증 명령:

```bash
cd backend
npm run financial:line-items:samsung
```

현재 저장 대상:

```text
재무상태표
- 자산총계
- 부채총계
- 자본총계
- 현금및현금성자산

손익계산서
- 매출액
- 영업이익
- 당기순이익

현금흐름표
- 영업활동현금흐름
```

먼저 `npm run financial:snapshot:samsung`으로 스냅샷 3개가 저장되어 있어야 한다.
