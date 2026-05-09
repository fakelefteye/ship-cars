-- Table de log des événements webhook Getaround
-- À appliquer une seule fois dans Supabase

CREATE TABLE IF NOT EXISTS webhook_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at  TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  event_type   TEXT,
  payload      JSONB,
  result       TEXT,  -- 'upserted' | 'deleted' | 'inserted' | 'skipped' | 'error' | 'pong' | 'ignored' | ...
  error        TEXT
);

-- Index pour trier par date et filtrer par type
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_type       ON webhook_events (event_type);

-- RLS : seul le service_role peut lire/écrire
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role full access" ON webhook_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Nettoyage automatique après 30 jours (optionnel)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-webhook-events', '0 3 * * *',
--   $$DELETE FROM webhook_events WHERE received_at < NOW() - INTERVAL '30 days'$$);
