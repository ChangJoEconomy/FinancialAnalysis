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
PER = 키움 ka10001 현재 PER 스냅샷
PBR = 키움 ka10001 현재 PBR 스냅샷
DEBT_RATIO = 부채총계 / 자본총계 * 100
OPERATING_MARGIN = 영업이익 / 매출액 * 100
REVENUE_GROWTH = (올해 매출액 - 전년 매출액) / 전년 매출액 * 100
OPERATING_PROFIT_GROWTH = (올해 영업이익 - 전년 영업이익) / 전년 영업이익 * 100
ROE = 당기순이익 / 자본총계 * 100
```

`PER`, `PBR`은 키움증권 REST API `ka10001`의 현재가, EPS, BPS 기반 최신 밸류에이션 값을 사용한다. 현재 DB 구조에서는 연간 재무 분석과 함께 저장하지만, DART 사업보고서 시점 값이 아니라 최신 스냅샷이라는 점에 주의한다.
