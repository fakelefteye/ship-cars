-- ============================================
-- Table des codes promo — Ship Cars
-- ============================================
-- À exécuter une fois dans l'éditeur SQL Supabase.

create table if not exists public.codes_promo (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique,
  pourcentage           numeric not null check (pourcentage > 0 and pourcentage <= 100),
  actif                 boolean not null default true,
  description           text,
  date_debut_validite   date,   -- nullable : si null, code valable quelle que soit la date de location
  date_fin_validite     date,   -- nullable : idem
  created_at            timestamptz not null default now(),
  check (date_debut_validite is null or date_fin_validite is null or date_debut_validite <= date_fin_validite)
);

-- Pour les bases existantes, ajouter les colonnes si absentes
alter table public.codes_promo
  add column if not exists date_debut_validite date,
  add column if not exists date_fin_validite   date;

-- Normalise le code en majuscules pour éviter les doublons de casse
create or replace function public.codes_promo_upper_code()
returns trigger language plpgsql as $$
begin
  new.code := upper(trim(new.code));
  return new;
end;
$$;

drop trigger if exists trg_codes_promo_upper on public.codes_promo;
create trigger trg_codes_promo_upper
  before insert or update on public.codes_promo
  for each row execute function public.codes_promo_upper_code();

-- Seed du code initial
insert into public.codes_promo (code, pourcentage, actif, description)
values ('GNB10', 10, true, 'Réduction 10% — lancement Grenoble')
on conflict (code) do nothing;

-- Ajout de la colonne sur la table reservations pour tracer le code utilisé
alter table public.reservations
  add column if not exists code_promo text,
  add column if not exists reduction_montant numeric default 0;

-- ============================================
-- RLS (Row Level Security)
-- ============================================
-- Toutes les lectures/écritures sur codes_promo passent par les API serveur
-- avec le client `supabaseAdmin` (service_role), qui bypasse RLS.
-- On active RLS sans aucune policy → personne d'autre ne peut lire/écrire.
alter table public.codes_promo enable row level security;

-- Aucune policy volontairement : seul service_role accède (via les API serveur).
-- Si tu veux un jour autoriser la lecture côté client (anon), décommente :
-- create policy "lecture publique des codes actifs"
--   on public.codes_promo for select
--   using (actif = true);
