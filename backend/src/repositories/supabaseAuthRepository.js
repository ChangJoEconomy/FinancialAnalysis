import { getSupabaseAnonKey, getSupabaseAuthUrl } from '../config/supabase.js';

export async function signUpWithPassword({ email, password, nickname }) {
  const data = await requestSupabaseAuth('signup', {
    method: 'POST',
    body: {
      email,
      password,
      data: {
        nickname
      }
    }
  });

  return data;
}

export async function signInWithPassword({ email, password }) {
  return requestSupabaseAuth('token?grant_type=password', {
    method: 'POST',
    body: {
      email,
      password
    }
  });
}

export async function getAuthUser(accessToken) {
  return requestSupabaseAuth('user', {
    method: 'GET',
    accessToken
  });
}

export async function updateAuthUser(accessToken, attributes) {
  return requestSupabaseAuth('user', {
    method: 'PUT',
    accessToken,
    body: attributes
  });
}

export async function signOut(accessToken) {
  await requestSupabaseAuth('logout', {
    method: 'POST',
    accessToken
  });
}

async function requestSupabaseAuth(path, { method, body, accessToken }) {
  const anonKey = getSupabaseAnonKey();
  const response = await fetch(getSupabaseAuthUrl(path), {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken || anonKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await readJson(response);

  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.error || 'Supabase Auth request failed.';
    throw Object.assign(new Error(message), {
      statusCode: response.status,
      details: data
    });
  }

  return data;
}

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
