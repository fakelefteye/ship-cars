-- ============================================
-- Activation RLS sur toutes les tables publiques
-- ============================================
-- Toutes les routes serveur utilisent désormais `supabaseAdmin` (service_role),
-- qui bypasse RLS. Activer RLS sans policy verrouille donc complètement les
-- tables pour le client anon (navigateur) et supprime les warnings Supabase.

alter table public.vehicules        enable row level security;
alter table public.reservations     enable row level security;
alter table public.options_location enable row level security;
alter table public.indisponibilites enable row level security;

-- Rappel : codes_promo a déjà RLS activée (voir codes_promo.sql)

-- Aucune policy créée volontairement : seul service_role accède via les
-- routes API Astro. Si tu veux un jour exposer des lectures côté client
-- (ex: catalogue de véhicules en SPA), tu ajouteras des policies ciblées.
