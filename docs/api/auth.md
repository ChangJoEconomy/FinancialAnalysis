# Backend Auth API

Supabase Auth를 사용해 인증하고, `public.users`에 서비스 프로필을 생성 또는 갱신한다.

현재 DB 스키마에서 `public.users.user_id`는 `BIGINT IDENTITY`이므로 Supabase `auth.users.id` UUID는 `public.users.provider_user_id`에 저장한다.

## POST /api/auth/signup

요청:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "nickname": "사용자"
}
```

처리:

1. Supabase Auth에 이메일/비밀번호 사용자를 생성한다.
2. 반환된 Auth UUID를 `public.users.provider_user_id`에 저장한다.
3. 서비스 내부 사용자 ID인 `public.users.user_id`를 응답한다.

## POST /api/auth/login

요청:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

응답에는 `accessToken`, `refreshToken`, `user`가 포함된다.

## GET /api/auth/me

헤더:

```http
Authorization: Bearer <accessToken>
```

현재 로그인 사용자의 Supabase Auth 정보와 서비스 프로필을 반환한다.

## POST /api/auth/logout

헤더:

```http
Authorization: Bearer <accessToken>
```

Supabase Auth 세션을 로그아웃 처리한다.
