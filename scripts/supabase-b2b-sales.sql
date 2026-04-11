-- B2B SaaS Sales Conversations — pgvector setup
-- Dataset: DeepMostInnovations/saas-sales-conversations (100K+ rows, Apache 2.0)
-- Purpose: Ground Marty (CEO agent) in B2B outreach patterns, objection handling,
--          lead qualification, follow-up cadence, and conversion techniques.
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Enable pgvector extension (idempotent)
create extension if not exists vector;

-- 2. Create the conversations table
create table if not exists b2b_sales_conversations (
  id bigserial primary key,
  conversation_id text,                -- original dataset conversation_id
  company_name text,
  product_name text,
  product_type text,                   -- SaaS product category
  scenario text,                       -- sales scenario description
  conversation text not null,          -- multi-turn dialogue text
  full_text text,                      -- full concatenated conversation
  outcome int,                         -- 0 = no conversion, 1 = converted
  conversation_length int,             -- number of turns
  customer_engagement float,           -- engagement score 0-1
  sales_effectiveness float,           -- effectiveness score 0-1
  conversation_style text,             -- e.g. consultative, aggressive, etc.
  conversation_flow text,              -- flow pattern
  communication_channel text,          -- email, phone, chat, etc.
  embedding vector(768),               -- Gemini gemini-embedding-001 = 768 dims
  created_at timestamptz default now()
);

-- 3. Create HNSW index for fast similarity search
create index if not exists b2b_sales_conversations_embedding_idx
  on b2b_sales_conversations
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 4. Indexes for common filters
create index if not exists b2b_sales_conversations_outcome_idx
  on b2b_sales_conversations (outcome);
create index if not exists b2b_sales_conversations_style_idx
  on b2b_sales_conversations (conversation_style);
create index if not exists b2b_sales_conversations_channel_idx
  on b2b_sales_conversations (communication_channel);

-- 5. Create search RPC function
create or replace function search_b2b_sales_conversations(
  query_embedding vector(768),
  match_count int default 5,
  match_threshold float default 0.4
)
returns table (
  id bigint,
  conversation_id text,
  company_name text,
  product_name text,
  product_type text,
  scenario text,
  conversation text,
  outcome int,
  conversation_length int,
  customer_engagement float,
  sales_effectiveness float,
  conversation_style text,
  conversation_flow text,
  communication_channel text,
  similarity float
)
language sql stable
as $$
  select
    id,
    conversation_id,
    company_name,
    product_name,
    product_type,
    scenario,
    conversation,
    outcome,
    conversation_length,
    customer_engagement,
    sales_effectiveness,
    conversation_style,
    conversation_flow,
    communication_channel,
    1 - (embedding <=> query_embedding) as similarity
  from b2b_sales_conversations
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- 6. Row-level security (service role bypasses, but good hygiene)
alter table b2b_sales_conversations enable row level security;

create policy "Service role full access"
  on b2b_sales_conversations
  for all
  using (true)
  with check (true);
