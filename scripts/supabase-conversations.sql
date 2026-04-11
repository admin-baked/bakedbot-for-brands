-- Budtender Conversations — pgvector setup
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- Source: HuggingFace pbisht/budtender_train (~3,600 Q&A pairs)
-- Purpose: Few-shot examples for Smokey budtender conversation style

-- 1. Enable pgvector extension (idempotent)
create extension if not exists vector;

-- 2. Create the conversations table
create table if not exists budtender_conversations (
  id bigserial primary key,
  prompt text not null,                  -- customer question about cannabis
  completion text not null,              -- budtender-style response
  embedding vector(768),                 -- Gemini gemini-embedding-001 = 768 dims
  created_at timestamptz default now()
);

-- 3. Create HNSW index for fast similarity search
create index if not exists budtender_conversations_embedding_idx
  on budtender_conversations
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 4. Create a search function for Smokey to find similar conversations
create or replace function search_budtender_conversations(
  query_embedding vector(768),
  match_count int default 3,
  match_threshold float default 0.5
)
returns table (
  id bigint,
  prompt text,
  completion text,
  similarity float
)
language sql stable
as $$
  select
    id,
    prompt,
    completion,
    1 - (embedding <=> query_embedding) as similarity
  from budtender_conversations
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- 5. Row-level security (service role bypasses, but good hygiene)
alter table budtender_conversations enable row level security;

create policy "Service role full access"
  on budtender_conversations
  for all
  using (true)
  with check (true);
