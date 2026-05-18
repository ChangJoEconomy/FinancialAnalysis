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

## GET /api/me/search-histories

현재 로그인 사용자의 검색 기록만 조회한다.

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

## GET /api/me/chat-sessions

현재 로그인 사용자의 AI 채팅 세션만 조회한다.

## GET /api/me/chat-sessions/:chatSessionId/messages

먼저 `ai_chat_sessions.chat_session_id`와 로그인 사용자의 `user_id` 소유권을 확인한 뒤 메시지를 조회한다.
