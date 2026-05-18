const REST_SUFFIX = '/rest/v1';
const AUTH_SUFFIX = '/auth/v1';

export function getSupabaseRestUrl(path) {
  return `${getSupabaseBaseUrl()}${REST_SUFFIX}/${path}`;
}

export function getSupabaseAuthUrl(path) {
  return `${getSupabaseBaseUrl()}${AUTH_SUFFIX}/${path}`;
}

export function getSupabaseAnonKey() {
  return requiredEnv('SUPABASE_ANON_KEY');
}

export function getSupabaseServiceRoleKey() {
  return requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
}

function getSupabaseBaseUrl() {
  const supabaseUrl = requiredEnv('SUPABASE_URL');

  return supabaseUrl
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/, '')
    .replace(/\/auth\/v1$/, '');
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
