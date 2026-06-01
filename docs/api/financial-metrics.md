# Financial Metrics

Phase 7은 `financial_line_items`에 저장된 주요 항목으로 `financial_metric_values`를 계산해 저장한다.

구현 파일:

```text
backend/src/services/financialMetricService.js
backend/src/workers/calculateSamsungFinancialMetrics.js
```

검증 명령:

```bash
cd backend
npm run financial:metrics:samsung
```

현재 계산 지표:

```text
DEBT_RATIO = 부채총계 / 자본총계 * 100
OPERATING_MARGIN = 영업이익 / 매출액 * 100
REVENUE_GROWTH = (올해 매출액 - 전년 매출액) / 전년 매출액 * 100
OPERATING_PROFIT_GROWTH = (올해 영업이익 - 전년 영업이익) / 전년 영업이익 * 100
ROE = 당기순이익 / 자본총계 * 100
```

`PER`, `PBR`은 주가, EPS, BPS 데이터가 준비된 뒤 계산한다.
