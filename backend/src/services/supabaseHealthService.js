import { getMetricDefinitionsCount } from '../repositories/supabaseRepository.js';

export async function checkSupabaseConnection() {
  try {
    const count = await getMetricDefinitionsCount();

    return {
      ok: true,
      status: 'ok',
      database: 'supabase',
      checkedTable: 'metric_definitions',
      metricDefinitionsCount: count
    };
  } catch (error) {
    return {
      ok: false,
      database: 'supabase',
      checkedTable: 'metric_definitions',
      error: error.message
    };
  }
}
