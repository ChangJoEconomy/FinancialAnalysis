import { getSupabaseRestUrl, getSupabaseServiceRoleKey } from '../config/supabase.js';

export async function requestSupabaseRest(path, { method = 'GET', prefer, body } = {}) {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  let response;

  try {
    response = await fetch(getSupabaseRestUrl(path), {
      method,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (error) {
    const cause = error.cause;
    const reason = cause?.code && cause?.hostname
      ? `${cause.code} ${cause.hostname}`
      : error.message;

    throw Object.assign(new Error(`Supabase REST network request failed: ${reason}`), {
      statusCode: 503,
      cause
    });
  }

  const data = await readJson(response);

  if (!response.ok) {
    const message = data?.message || data?.hint || 'Supabase REST request failed.';
    throw Object.assign(new Error(message), {
      statusCode: response.status,
      details: data
    });
  }

  return data || [];
}

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
