# User-Scoped Data API

모든 엔드포인트는 Supabase Auth `accessToken`을 요구한다.

```http
Authorization: Bearer <accessToken>
```

백엔드는 토큰으로 Supabase Auth 사용자를 확인한 뒤 `public.users.provider_user_id`를 통해 서비스 내부 `user_id`를 찾는다. 이후 모든 사용자 데이터 조회와 변경은 이 `user_id`로 필터링한다.

## GET /api/me/favorite-stocks

현재 로그인 사용자의 관심종목만 조회한다.

## POST /api/me/favorite-stocks

요청:

```json
{
  "stockId": 1,
  "memo": "관심 메모",
  "displayOrder": 0
}
```

`user_id`는 요청 body에서 받지 않고 로그인 사용자 기준으로 서버가 주입한다.

## DELETE /api/me/favorite-stocks/:favoriteId

`favorite_id`와 로그인 사용자의 `user_id`가 모두 일치할 때만 삭제한다.

## PATCH /api/me/favorite-stocks/:favoriteId

관심종목 메모 또는 정렬 순서를 변경한다. `favorite_id`와 로그인 사용자의 `user_id`가 모두 일치할 때만 수정한다.

요청:

```json
{
  "memo": "실적 발표 후 다시 확인",
  "displayOrder": 1
}
```

## GET /api/me/search-histories

현재 로그인 사용자의 검색 기록만 조회한다.
같은 `stockId`를 여러 번 조회한 경우 최근 기록 1개만 반환한다.

## POST /api/me/search-histories

요청:

```json
{
  "queryText": "삼성전자",
  "stockId": 1,
  "resultCount": 1
}
```

`user_id`는 서버가 로그인 사용자 기준으로 주입한다.

검색 결과 클릭 흐름에서는 같은 저장 로직을 사용하는 `POST /api/stocks/search-click`을 호출한다.

## GET /api/me/analysis-settings

현재 로그인 사용자의 분석 설정을 조회한다. 설정이 없으면 기본 프리셋 3개를 생성한다.

기본 프리셋:

```text
conservative: 안정성 중심
balanced: 안정성, 성장성, 수익성 균형
growth: 성장성 중심
```

응답:

```json
{
  "data": {
    "defaultSetting": {
      "risk_type": "balanced",
      "is_default": true
    },
    "settings": []
  }
}
```

## PUT /api/me/analysis-settings

사용자의 기본 분석 설정을 변경한다.

요청:

```json
{
  "riskType": "growth"
}
```

가중치를 직접 조정할 수도 있다.

```json
{
  "riskType": "balanced",
  "weights": {
    "stability": 0.25,
    "growth": 0.25,
    "profitability": 0.25,
    "valuation": 0.2,
    "news": 0.05
  }
}
```

`user_id`는 서버가 로그인 사용자 기준으로 주입한다.

## GET /api/me/chat-sessions

현재 로그인 사용자의 AI 채팅 세션만 조회한다.

특정 종목의 이전 질문만 조회할 수 있다.

```http
GET /api/me/chat-sessions?stockId=1&limit=20
```

## POST /api/me/chat-sessions

종목별 AI 질문 세션을 생성한다.

```json
{
  "stockId": 1,
  "settingId": 2,
  "title": "삼성전자 재무 질문"
}
```

## GET /api/me/chat-sessions/:chatSessionId/messages

먼저 `ai_chat_sessions.chat_session_id`와 로그인 사용자의 `user_id` 소유권을 확인한 뒤 메시지를 조회한다.

## POST /api/me/chat-sessions/:chatSessionId/messages

최신 재무 분석 결과를 근거로 Gemini에 추가 질문을 전달하고 사용자 질문과 AI 답변을 저장한다.

```json
{
  "message": "이 회사의 재무 상태에서 가장 먼저 확인할 점은 뭐야?"
}
```

Gemini 호출에 실패하면 최신 규칙 기반 재무 설명으로 fallback 답변을 저장한다.

Gemini context에는 다음 정보를 포함한다.

```text
종목 정보
최신 종합 분석 결과
사용자 분석 설정과 가중치
지표별 값, 신호, 판단 이유
metric_definitions 초보자 설명
최근 대화 메시지
```

직접적인 매수, 매도, 보유 지시가 포함된 답변은 안전한 fallback 답변으로 대체한다.
