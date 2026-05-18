import { getSupabaseRestUrl, getSupabaseServiceRoleKey } from '../config/supabase.js';

export async function getMetricDefinitionsCount() {
  const url = getSupabaseRestUrl('metric_definitions?select=metric_code&limit=1');
  const serviceRoleKey = getSupabaseServiceRoleKey();

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'count=exact',
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Supabase REST request failed: ${response.status} ${body}`);
  }

  const contentRange = response.headers.get('content-range');
  if (!contentRange) {
    return null;
  }

  const total = contentRange.split('/').at(-1);
  return total && total !== '*' ? Number(total) : null;
}
