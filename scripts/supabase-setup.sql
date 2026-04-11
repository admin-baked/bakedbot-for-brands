-- Cannabis Science Knowledge Base — pgvector setup
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Create the knowledge base table
create table if not exists cannabis_science_qa (
  id bigserial primary key,
  question text not null,
  answer text not null,
  context text,                        -- source chunk from the paper
  source_pdf text,                     -- original PDF filename
  category text,                       -- curated: terpenes, effects, extraction, pharmacology, etc.
  embedding vector(768),               -- Gemini text-embedding-004 = 768 dims
  created_at timestamptz default now()
);

-- 3. Create HNSW index for fast similarity search
create index if not exists cannabis_science_qa_embedding_idx
  on cannabis_science_qa
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- 4. Create a search function that Smokey will call
create or replace function search_cannabis_science(
  query_embedding vector(768),
  match_count int default 5,
  match_threshold float default 0.5
)
returns table (
  id bigint,
  question text,
  answer text,
  context text,
  source_pdf text,
  category text,
  similarity float
)
language sql stable
as $$
  select
    id,
    question,
    answer,
    context,
    source_pdf,
    category,
    1 - (embedding <=> query_embedding) as similarity
  from cannabis_science_qa
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- 5. Row-level security (service role bypasses, but good hygiene)
alter table cannabis_science_qa enable row level security;

create policy "Service role full access"
  on cannabis_science_qa
  for all
  using (true)
  with check (true);
