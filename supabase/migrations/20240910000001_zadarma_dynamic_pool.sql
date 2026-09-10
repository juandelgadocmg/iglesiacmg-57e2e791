CREATE TABLE IF NOT EXISTS zadarma_pool (
  extension TEXT PRIMARY KEY,
  assigned_user_id UUID REFERENCES auth.users(id),
  last_heartbeat TIMESTAMPTZ
);

-- Insert available extensions
INSERT INTO zadarma_pool (extension)
VALUES 
  ('337021-100'), ('337021-101'), ('337021-102'), ('337021-103'), ('337021-104'),
  ('337021-105'), ('337021-108'), ('337021-109'), ('337021-110'), ('337021-111')
ON CONFLICT (extension) DO NOTHING;

-- Function to allocate an extension
CREATE OR REPLACE FUNCTION allocate_zadarma_extension(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ext TEXT;
BEGIN
  -- First, check if the user already has one assigned and active
  SELECT extension INTO v_ext
  FROM zadarma_pool
  WHERE assigned_user_id = p_user_id
  LIMIT 1;

  IF v_ext IS NOT NULL THEN
    -- Update heartbeat
    UPDATE zadarma_pool SET last_heartbeat = NOW() WHERE extension = v_ext;
    RETURN v_ext;
  END IF;

  -- Second, try to find an available extension (unassigned or expired > 3 minutes)
  SELECT extension INTO v_ext
  FROM zadarma_pool
  WHERE assigned_user_id IS NULL OR last_heartbeat < NOW() - INTERVAL '3 minutes'
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_ext IS NOT NULL THEN
    UPDATE zadarma_pool 
    SET assigned_user_id = p_user_id, last_heartbeat = NOW()
    WHERE extension = v_ext;
    RETURN v_ext;
  END IF;

  RETURN NULL; -- No extensions available
END;
$$;

-- Function to release an extension
CREATE OR REPLACE FUNCTION release_zadarma_extension(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE zadarma_pool 
  SET assigned_user_id = NULL, last_heartbeat = NULL
  WHERE assigned_user_id = p_user_id;
END;
$$;

-- Grant permissions
GRANT SELECT, UPDATE ON zadarma_pool TO authenticated;
