-- Cannabis Operational Datasets — Supabase pgvector setup
-- Run in Supabase SQL Editor AFTER supabase-setup.sql (which creates cannabis_science_qa)

-- ============================================================================
-- 1. CANNABIS STRAINS (Leafly + Seed City merged)
--    Powers Smokey's strain recommendation engine
-- ============================================================================
create table if not exists cannabis_strains (
  id bigserial primary key,
  name text not null,
  slug text unique,
  category text,                          -- indica, sativa, hybrid
  description text,
  -- Cannabinoid profile
  thc_pct float,
  cbd_pct float,
  cbg_pct float,
  thcv_pct float,
  -- Effect scores (0-1 normalized)
  effect_relaxed float, effect_sleepy float, effect_happy float,
  effect_euphoric float, effect_creative float, effect_energetic float,
  effect_focused float, effect_hungry float, effect_uplifted float,
  effect_talkative float, effect_giggly float, effect_tingly float,
  effect_aroused float,
  -- Terpene scores
  terp_myrcene float, terp_limonene float, terp_pinene float,
  terp_caryophyllene float, terp_linalool float, terp_humulene float,
  terp_terpinolene float, terp_ocimene float,
  -- Top flavor tags (comma-separated)
  flavors text,
  top_effect text,
  -- Medical condition scores (top 5)
  condition_pain float, condition_stress float, condition_anxiety float,
  condition_insomnia float, condition_depression float,
  -- Negative effects
  negative_dry_mouth float, negative_dry_eyes float, negative_paranoid float,
  -- Cultivation (from Seed City merge)
  grow_difficulty text,
  flowering_days int,
  yield_indoor text,
  yield_outdoor text,
  environment text,
  -- Metadata
  review_count int,
  average_rating float,
  source text default 'leafly',           -- leafly or seedcity
  parent_strains text,
  -- Vector for semantic search
  embedding vector(768),
  created_at timestamptz default now()
);

create index if not exists cannabis_strains_embedding_idx
  on cannabis_strains using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

create index if not exists cannabis_strains_category_idx on cannabis_strains(category);
create index if not exists cannabis_strains_slug_idx on cannabis_strains(slug);

create or replace function search_cannabis_strains(
  query_embedding vector(768),
  match_count int default 5,
  match_threshold float default 0.4
)
returns table (
  id bigint, name text, category text, description text,
  thc_pct float, cbd_pct float, top_effect text, flavors text,
  terp_myrcene float, terp_limonene float, terp_caryophyllene float,
  terp_linalool float, terp_pinene float,
  average_rating float, review_count int, similarity float
)
language sql stable
as $$
  select
    id, name, category, description,
    thc_pct, cbd_pct, top_effect, flavors,
    terp_myrcene, terp_limonene, terp_caryophyllene,
    terp_linalool, terp_pinene,
    average_rating, review_count,
    1 - (embedding <=> query_embedding) as similarity
  from cannabis_strains
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================================
-- 2. CANNABIS LICENSES (42.5K businesses, 20 states)
--    Powers Ezal competitor mapping + Craig outbound prospecting
-- ============================================================================
create table if not exists cannabis_licenses (
  id bigserial primary key,
  license_number text,
  license_type text,                      -- retail, cultivation, manufacturing, etc.
  license_status text,                    -- active, inactive, suspended
  business_legal_name text,
  business_dba_name text,
  business_owner_name text,
  business_website text,
  business_email text,
  business_phone text,
  premise_street_address text,
  premise_city text,
  premise_state text not null,
  premise_county text,
  premise_zip_code text,
  premise_latitude float,
  premise_longitude float,
  issue_date date,
  expiration_date date,
  licensing_authority text,
  activity text,
  data_refreshed_date timestamptz,
  created_at timestamptz default now()
);

-- Geo + state indexes for fast proximity queries
create index if not exists cannabis_licenses_state_idx on cannabis_licenses(premise_state);
create index if not exists cannabis_licenses_type_idx on cannabis_licenses(license_type);
create index if not exists cannabis_licenses_status_idx on cannabis_licenses(license_status);
create index if not exists cannabis_licenses_city_idx on cannabis_licenses(premise_city);
create index if not exists cannabis_licenses_geo_idx on cannabis_licenses(premise_latitude, premise_longitude);

-- ============================================================================
-- 3. CANNABIS LAB RESULTS (910K COAs, 14 states)
--    Product quality intelligence + menu enrichment
-- ============================================================================
create table if not exists cannabis_lab_results (
  id bigserial primary key,
  product_name text,
  strain_name text,
  product_type text,                      -- flower, edible, concentrate, etc.
  batch_number text,
  producer_name text,
  producer_state text not null,
  lab_name text,
  -- Cannabinoid results
  total_thc float,
  total_cbd float,
  total_cannabinoids float,
  total_terpenes float,
  -- Test status
  status text,                            -- pass/fail
  date_tested date,
  -- Structured data (no vectors — query by product_type + state + strain)
  created_at timestamptz default now()
);

create index if not exists cannabis_lab_results_state_idx on cannabis_lab_results(producer_state);
create index if not exists cannabis_lab_results_type_idx on cannabis_lab_results(product_type);
create index if not exists cannabis_lab_results_strain_idx on cannabis_lab_results(strain_name);
create index if not exists cannabis_lab_results_thc_idx on cannabis_lab_results(total_thc);

-- ============================================================================
-- 4. CANNABIS PRICE INDEX (weekly retail pricing snapshots)
--    Market benchmarking — CannMenus verifies live pricing
-- ============================================================================
create table if not exists cannabis_price_index (
  id bigserial primary key,
  snapshot_week date not null,
  subcategory text not null,              -- flower, edibles, concentrates, vapes, etc.
  avg_price float,
  avg_discount_pct float,
  product_count int,
  index_value float,                      -- baseline Dec 8 2025 = 100
  created_at timestamptz default now()
);

create index if not exists cannabis_price_index_week_idx on cannabis_price_index(snapshot_week);
create index if not exists cannabis_price_index_cat_idx on cannabis_price_index(subcategory);
create unique index if not exists cannabis_price_index_unique_idx
  on cannabis_price_index(snapshot_week, subcategory);

-- ============================================================================
-- RLS for all tables
-- ============================================================================
alter table cannabis_strains enable row level security;
alter table cannabis_licenses enable row level security;
alter table cannabis_lab_results enable row level security;
alter table cannabis_price_index enable row level security;

create policy "Service role full access" on cannabis_strains for all using (true) with check (true);
create policy "Service role full access" on cannabis_licenses for all using (true) with check (true);
create policy "Service role full access" on cannabis_lab_results for all using (true) with check (true);
create policy "Service role full access" on cannabis_price_index for all using (true) with check (true);
