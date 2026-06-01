# AI 설명 생성

Phase 9는 규칙 기반 신호등 분석 결과를 LLM에 전달해 초보자용 설명 문장을 생성한다.

## 사용 모델

```text
Provider: Google Gemini API
Model: gemini-3-flash-preview
API Key: LLM_API_KEY
```

## 처리 흐름

```text
1. Phase 8 규칙 기반 신호등 분석을 먼저 실행해 입력 데이터를 보장한다.
2. 규칙 기반 signal, score, reason을 Gemini에 전달한다.
3. Gemini는 판단 자체를 바꾸지 않고 설명 문장만 생성한다.
4. LLM 결과는 prompt_version=llm-financial-v1인 별도 ai_analysis_runs로 저장한다.
5. ai_metric_analysis_items에는 같은 signal/score와 LLM 설명을 저장한다.
6. ai_analysis_evidences에는 근거 financial_metric_values를 다시 연결한다.
```

## 실행

```bash
cd backend
npm run analysis:llm-explanation:samsung
```

기본 기준 연도는 `2024`이다.

```bash
npm run analysis:llm-explanation:samsung -- 2024
```

## 저장 방식

규칙 기반 분석과 LLM 설명 분석은 같은 `source_data_hash`를 사용하지만 `prompt_version`을 분리한다.

```text
rules-financial-v1
- model_name: rules-v1
- 규칙 기반 설명

llm-financial-v1
- model_name: gemini-3-flash-preview
- Gemini가 생성한 초보자용 설명
```

이 구조를 쓰면 Phase 8을 다시 실행해도 규칙 기반 run이 깨지지 않고, Phase 9 결과도 별도로 갱신할 수 있다.

## 안전 규칙

프롬프트에는 아래 제약을 포함한다.

```text
매수 추천 금지
매도 추천 금지
수익률 보장 금지
목표가 제시 금지
근거 없는 전망 금지
계산된 신호등 결과 변경 금지
```
