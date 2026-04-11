-- Sales Conversations Knowledge Base — pgvector setup
-- 3,412 multi-turn sales dialogues (goendalf666/sales-conversations)
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Enable pgvector extension (idempotent)
create extension if not exists vector;

-- 2. Create the sales conversations table
create table if not exists sales_conversations (
  id bigserial primary key,
  conversation text not null,            -- full multi-turn dialogue concatenated
  turn_count int not null default 0,     -- number of dialogue turns
  summary text,                          -- short summary for quick scanning
  embedding vector(768),                 -- Gemini gemini-embedding-001 = 768 dims
  created_at timestamptz default now()
);

-- 3. Create HNSW index for fast similarity search
create index if not exists sales_conversations_embedding_idx
  on sales_conversations
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 4. Create a search function for agent tools
create or replace function search_sales_conversations(
  query_embedding vector(768),
  match_count int default 5,
  match_threshold float default 0.4
)
returns table (
  id bigint,
  conversation text,
  turn_count int,
  summary text,
  similarity float
)
language sql stable
as $$
  select
    id,
    conversation,
    turn_count,
    summary,
    1 - (embedding <=> query_embedding) as similarity
  from sales_conversations
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- 5. Row-level security (service role bypasses, but good hygiene)
alter table sales_conversations enable row level security;

create policy "Service role full access"
  on sales_conversations
  for all
  using (true)
  with check (true);
