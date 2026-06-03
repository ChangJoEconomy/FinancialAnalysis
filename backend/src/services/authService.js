import {
  getAuthUser,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  updateAuthUser
} from '../repositories/supabaseAuthRepository.js';
import { ensureUserProfileForAuthUser } from '../repositories/userRepository.js';

export async function signup({ email, password, nickname }) {
  validateAuthInput({ email, password, nickname }, { requireNickname: true });

  const authResult = await signUpWithPassword({ email, password, nickname });
  const authUser = authResult.user;

  if (!authUser?.id) {
    throw badRequest('Supabase Auth did not return a user. Check email confirmation settings.');
  }

  const profile = await ensureUserProfileForAuthUser(authUser, nickname);

  return buildAuthResponse(authResult, profile);
}

export async function login({ email, password }) {
  validateAuthInput({ email, password });

  const authResult = await signInWithPassword({ email, password });
  const profile = await ensureUserProfileForAuthUser(authResult.user);

  return buildAuthResponse(authResult, profile);
}

export async function me(accessToken) {
  if (!accessToken) {
    throw unauthorized('Missing bearer token.');
  }

  const authUser = await getAuthUser(accessToken);
  const profile = await ensureUserProfileForAuthUser(authUser);

  return {
    user: profile,
    authUser: sanitizeAuthUser(authUser)
  };
}

export async function logout(accessToken) {
  if (!accessToken) {
    throw unauthorized('Missing bearer token.');
  }

  await signOut(accessToken);
  return { status: 'ok' };
}

export async function updateAccount(accessToken, { email, password } = {}) {
  if (!accessToken) {
    throw unauthorized('Missing bearer token.');
  }

  const attributes = validateAccountUpdateInput({ email, password });
  const authResult = await updateAuthUser(accessToken, attributes);
  const authUser = normalizeAuthUser(authResult);

  if (!authUser?.id) {
    throw badRequest('Supabase Auth did not return an updated user.');
  }

  const profile = await ensureUserProfileForAuthUser(authUser);

  return {
    user: profile,
    authUser: sanitizeAuthUser(authUser)
  };
}

function buildAuthResponse(authResult, profile) {
  return {
    accessToken: authResult.access_token || null,
    refreshToken: authResult.refresh_token || null,
    expiresIn: authResult.expires_in || null,
    tokenType: authResult.token_type || 'bearer',
    user: profile,
    authUser: sanitizeAuthUser(authResult.user)
  };
}

function sanitizeAuthUser(authUser) {
  if (!authUser) {
    return null;
  }

  return {
    id: authUser.id,
    email: authUser.email,
    emailConfirmedAt: authUser.email_confirmed_at || null,
    createdAt: authUser.created_at || null
  };
}

function normalizeAuthUser(authResult) {
  return authResult?.user || authResult;
}

function validateAuthInput({ email, password, nickname }, { requireNickname = false } = {}) {
  if (!email || !email.includes('@')) {
    throw badRequest('Valid email is required.');
  }

  if (!password || password.length < 6) {
    throw badRequest('Password must be at least 6 characters.');
  }

  if (requireNickname && !nickname?.trim()) {
    throw badRequest('Nickname is required.');
  }
}

function validateAccountUpdateInput({ email, password }) {
  const attributes = {};
  const normalizedEmail = email?.trim();

  if (normalizedEmail) {
    if (!normalizedEmail.includes('@')) {
      throw badRequest('Valid email is required.');
    }
    attributes.email = normalizedEmail;
  }

  if (password) {
    if (password.length < 6) {
      throw badRequest('Password must be at least 6 characters.');
    }
    attributes.password = password;
  }

  if (!Object.keys(attributes).length) {
    throw badRequest('Email or password is required.');
  }

  return attributes;
}

function badRequest(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function unauthorized(message) {
  return Object.assign(new Error(message), { statusCode: 401 });
}
