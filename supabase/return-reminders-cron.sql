-- ============================================================
-- Planificateur : e-mails d'instructions de restitution (12 h avant la fin de la location)
-- Déjà appliqué sur la base de production. À rejouer uniquement sur une nouvelle base.
--
-- Toutes les 15 minutes, la base appelle POST /api/cron/return-reminders (avec un secret
-- partagé). Le site envoie alors les e-mails de restitution dont l'heure est venue.
-- Sans risque de doublon : chaque réservation n'est traitée qu'une fois (mail_restitution_at).
--
-- Arrêter :   SELECT cron.unschedule('return-reminders');
-- Suivre :    SELECT status_code, created FROM net._http_response ORDER BY id DESC LIMIT 10;
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Secret partagé entre le planificateur et le site (généré aléatoirement, jamais dans le code)
INSERT INTO public.app_config (key, value)
VALUES ('cron_secret', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
ON CONFLICT (key) DO NOTHING;

SELECT cron.schedule(
  'return-reminders',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.shipcars.fr/api/cron/return-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM public.app_config WHERE key = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
