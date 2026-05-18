import { loadEnv } from '../utils/env.js';
import { checkSupabaseConnection } from '../services/supabaseHealthService.js';

loadEnv();

const result = await checkSupabaseConnection();

if (!result.ok) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
