# 규칙 기반 신호등 분석

Phase 8은 `financial_metric_values`에 저장된 재무 지표를 기준으로 `green`, `orange`, `red` 신호를 계산해 저장한다.

## 입력 데이터

```text
financial_metric_values
```

현재 삼성전자 MVP에서 사용하는 지표:

```text
DEBT_RATIO
OPERATING_MARGIN
REVENUE_GROWTH
OPERATING_PROFIT_GROWTH
ROE
```

## 저장 테이블

```text
ai_analysis_runs
ai_metric_analysis_items
ai_analysis_evidences
```

## 실행

```bash
cd backend
npm run analysis:traffic-light:samsung
```

기본 기준 연도는 `2024`이고, 다른 연도를 테스트할 때는 인자로 넘긴다.

```bash
npm run analysis:traffic-light:samsung -- 2024
```

## 판정 기준

| 지표 | green | orange | red |
|---|---|---|---|
| DEBT_RATIO | 100% 미만 | 100% 이상 200% 미만 | 200% 이상 |
| OPERATING_MARGIN | 10% 이상 | 3% 이상 10% 미만 | 3% 미만 |
| REVENUE_GROWTH | 10% 이상 | 0% 이상 10% 미만 | 0% 미만 |
| OPERATING_PROFIT_GROWTH | 10% 이상 | 0% 이상 10% 미만 | 0% 미만 |
| ROE | 10% 이상 | 5% 이상 10% 미만 | 5% 미만 |

## 구현 위치

```text
backend/src/services/trafficLightAnalysisService.js
backend/src/repositories/aiAnalysisRepository.js
backend/src/workers/analyzeSamsungTrafficLight.js
```

## 주의

이 단계는 LLM을 호출하지 않는다. 판단은 재현 가능한 규칙으로 수행하고, LLM 기반 자연어 설명은 Phase 9에서 붙인다.
