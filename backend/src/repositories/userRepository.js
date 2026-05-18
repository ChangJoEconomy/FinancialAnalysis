import { requestSupabaseRest } from './supabaseRestRepository.js';

const USER_SELECT = 'user_id,email,nickname,login_provider,provider_user_id,status,last_login_at,created_at,updated_at';
const LOGIN_PROVIDER = 'local';
const AUTH_MANAGED_PASSWORD_MARKER = 'supabase_auth_managed';

export async function findUserProfileByAuthId(authUserId) {
  const encodedAuthUserId = encodeURIComponent(authUserId);
  const rows = await requestSupabaseRest(
    `users?select=${USER_SELECT}&login_provider=eq.${LOGIN_PROVIDER}&provider_user_id=eq.${encodedAuthUserId}&limit=1`
  );

  return rows[0] || null;
}

export async function findUserProfileByEmail(email) {
  const encodedEmail = encodeURIComponent(email);
  const rows = await requestSupabaseRest(
    `users?select=${USER_SELECT}&email=eq.${encodedEmail}&limit=1`
  );

  return rows[0] || null;
}

export async function createUserProfileFromAuthUser(authUser, nickname) {
  const displayName = nickname || authUser.user_metadata?.nickname || emailName(authUser.email);

  const rows = await requestSupabaseRest('users', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      email: authUser.email,
      password_hash: AUTH_MANAGED_PASSWORD_MARKER,
      nickname: displayName,
      login_provider: LOGIN_PROVIDER,
      provider_user_id: authUser.id,
      last_login_at: new Date().toISOString()
    }
  });

  return rows[0];
}

export async function updateUserProfile(userId, patch) {
  const rows = await requestSupabaseRest(`users?user_id=eq.${userId}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: patch
  });

  return rows[0];
}

export async function ensureUserProfileForAuthUser(authUser, nickname) {
  const existingByAuthId = await findUserProfileByAuthId(authUser.id);
  if (existingByAuthId) {
    return updateUserProfile(existingByAuthId.user_id, {
      email: authUser.email,
      nickname: nickname || existingByAuthId.nickname,
      last_login_at: new Date().toISOString()
    });
  }

  const existingByEmail = await findUserProfileByEmail(authUser.email);
  if (existingByEmail) {
    return updateUserProfile(existingByEmail.user_id, {
      provider_user_id: authUser.id,
      login_provider: LOGIN_PROVIDER,
      password_hash: AUTH_MANAGED_PASSWORD_MARKER,
      nickname: nickname || existingByEmail.nickname,
      last_login_at: new Date().toISOString()
    });
  }

  return createUserProfileFromAuthUser(authUser, nickname);
}

function emailName(email) {
  return email?.split('@')[0] || 'user';
}
