import { getAuthUser } from '../repositories/supabaseAuthRepository.js';
import { ensureUserProfileForAuthUser } from '../repositories/userRepository.js';

export async function requireAuthContext(req) {
  const accessToken = getBearerToken(req);

  if (!accessToken) {
    throw Object.assign(new Error('Missing bearer token.'), { statusCode: 401 });
  }

  const authUser = await getAuthUser(accessToken);
  const profile = await ensureUserProfileForAuthUser(authUser);

  return {
    accessToken,
    authUser,
    user: profile,
    userId: profile.user_id
  };
}

export async function getOptionalAuthContext(req) {
  if (!getBearerToken(req)) {
    return null;
  }

  return requireAuthContext(req);
}

export function getBearerToken(req) {
  const authorization = req.headers.authorization || '';
  const [scheme, token] = authorization.split(' ');

  if (scheme?.toLowerCase() !== 'bearer') {
    return null;
  }

  return token || null;
}
