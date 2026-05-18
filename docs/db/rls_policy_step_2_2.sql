-- ============================================================================
-- Step 2-2. User Data Protection RLS Policies
-- Target: Supabase PostgreSQL public schema
--
-- Apply this in the Supabase SQL Editor after schema_init_DDL.sql.
--
-- Current auth mapping:
--   auth.users.id UUID -> public.users.provider_user_id text
--   public.users.user_id BIGINT -> service domain ownership key
--
-- The backend uses SUPABASE_SERVICE_ROLE_KEY and enforces ownership in API
-- routes. These RLS policies are the safety layer for any direct Supabase
-- client access using anon/authenticated keys.
-- ============================================================================

SET search_path TO public;

-- ---------------------------------------------------------------------------
-- Helper: map Supabase Auth UUID to the service user_id.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS BIGINT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.user_id
  FROM users u
  WHERE u.login_provider = 'local'
    AND u.provider_user_id = auth.uid()::TEXT
    AND u.status = 'active'
  LIMIT 1
$$;

COMMENT ON FUNCTION current_app_user_id() IS
'Maps auth.uid() to public.users.user_id through public.users.provider_user_id.';

-- ---------------------------------------------------------------------------
-- Public read tables.
-- ---------------------------------------------------------------------------

ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stocks_public_read ON stocks;
CREATE POLICY stocks_public_read
ON stocks
FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

DROP POLICY IF EXISTS stock_aliases_public_read ON stock_aliases;
CREATE POLICY stock_aliases_public_read
ON stock_aliases
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM stocks s
    WHERE s.stock_id = stock_aliases.stock_id
      AND s.is_active = TRUE
  )
);

DROP POLICY IF EXISTS metric_definitions_public_read ON metric_definitions;
CREATE POLICY metric_definitions_public_read
ON metric_definitions
FOR SELECT
TO anon, authenticated
USING (TRUE);

-- ---------------------------------------------------------------------------
-- User profile.
-- ---------------------------------------------------------------------------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own
ON users
FOR SELECT
TO authenticated
USING (
  provider_user_id = auth.uid()::TEXT
  AND status = 'active'
);

DROP POLICY IF EXISTS users_insert_own ON users;
CREATE POLICY users_insert_own
ON users
FOR INSERT
TO authenticated
WITH CHECK (
  provider_user_id = auth.uid()::TEXT
  AND status = 'active'
);

DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own
ON users
FOR UPDATE
TO authenticated
USING (
  provider_user_id = auth.uid()::TEXT
  AND status = 'active'
)
WITH CHECK (
  provider_user_id = auth.uid()::TEXT
  AND status = 'active'
);

-- ---------------------------------------------------------------------------
-- User-owned tables.
-- ---------------------------------------------------------------------------

ALTER TABLE user_analysis_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_search_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_analysis_settings_own_all ON user_analysis_settings;
CREATE POLICY user_analysis_settings_own_all
ON user_analysis_settings
FOR ALL
TO authenticated
USING (user_id = current_app_user_id())
WITH CHECK (user_id = current_app_user_id());

DROP POLICY IF EXISTS stock_search_histories_own_all ON stock_search_histories;
CREATE POLICY stock_search_histories_own_all
ON stock_search_histories
FOR ALL
TO authenticated
USING (user_id = current_app_user_id())
WITH CHECK (user_id = current_app_user_id());

DROP POLICY IF EXISTS favorite_stocks_own_all ON favorite_stocks;
CREATE POLICY favorite_stocks_own_all
ON favorite_stocks
FOR ALL
TO authenticated
USING (user_id = current_app_user_id())
WITH CHECK (user_id = current_app_user_id());

DROP POLICY IF EXISTS ai_chat_sessions_own_all ON ai_chat_sessions;
CREATE POLICY ai_chat_sessions_own_all
ON ai_chat_sessions
FOR ALL
TO authenticated
USING (user_id = current_app_user_id())
WITH CHECK (user_id = current_app_user_id());

DROP POLICY IF EXISTS ai_chat_messages_own_select ON ai_chat_messages;
CREATE POLICY ai_chat_messages_own_select
ON ai_chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM ai_chat_sessions s
    WHERE s.chat_session_id = ai_chat_messages.chat_session_id
      AND s.user_id = current_app_user_id()
  )
);

DROP POLICY IF EXISTS ai_chat_messages_own_insert ON ai_chat_messages;
CREATE POLICY ai_chat_messages_own_insert
ON ai_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM ai_chat_sessions s
    WHERE s.chat_session_id = ai_chat_messages.chat_session_id
      AND s.user_id = current_app_user_id()
  )
);

DROP POLICY IF EXISTS ai_chat_messages_own_update ON ai_chat_messages;
CREATE POLICY ai_chat_messages_own_update
ON ai_chat_messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM ai_chat_sessions s
    WHERE s.chat_session_id = ai_chat_messages.chat_session_id
      AND s.user_id = current_app_user_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM ai_chat_sessions s
    WHERE s.chat_session_id = ai_chat_messages.chat_session_id
      AND s.user_id = current_app_user_id()
  )
);

DROP POLICY IF EXISTS ai_chat_messages_own_delete ON ai_chat_messages;
CREATE POLICY ai_chat_messages_own_delete
ON ai_chat_messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM ai_chat_sessions s
    WHERE s.chat_session_id = ai_chat_messages.chat_session_id
      AND s.user_id = current_app_user_id()
  )
);

-- ---------------------------------------------------------------------------
-- Minimal grants for direct Supabase clients. Service role bypasses RLS.
-- ---------------------------------------------------------------------------

GRANT SELECT ON stocks, stock_aliases, metric_definitions TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON
  user_analysis_settings,
  stock_search_histories,
  favorite_stocks,
  ai_chat_sessions,
  ai_chat_messages
TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
