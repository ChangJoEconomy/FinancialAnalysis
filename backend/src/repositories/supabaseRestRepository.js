import { getSupabaseRestUrl, getSupabaseServiceRoleKey } from '../config/supabase.js';

export async function requestSupabaseRest(path, { method = 'GET', prefer, body } = {}) {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const response = await fetch(getSupabaseRestUrl(path), {
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
