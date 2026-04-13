"""
Cognee Experiment — MCP Server for BakedBot

Wraps cognee's remember/recall/forget API as MCP tools so Claude Code
can query the knowledge graph directly during this session.

Backends (local, no external DB):
  - Graph/relational: SQLite (default cognee)
  - Vector: LanceDB (default cognee)

LLM/Embedding: Gemini (configured via env, free tier)

Run via: python scripts/cognee-experiment/mcp_server.py
Configured in: ~/.claude/settings.json under mcpServers
"""

import os

# Load .env.local before importing cognee so env vars are set first
def load_env_local():
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env.local")
    env_path = os.path.normpath(env_path)
    if not os.path.exists(env_path):
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value

load_env_local()

# Configure cognee to use Gemini (free) before importing
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
os.environ.setdefault("LLM_API_KEY", GEMINI_KEY)
os.environ.setdefault("LLM_MODEL", "gemini/gemini-2.0-flash")
os.environ.setdefault("EMBEDDING_MODEL", "gemini/gemini-embedding-001")
os.environ.setdefault("EMBEDDING_API_KEY", GEMINI_KEY)
# Disable access control for local experiment
os.environ.setdefault("ENABLE_BACKEND_ACCESS_CONTROL", "false")
os.environ.setdefault("COGNEE_SKIP_CONNECTION_TEST", "true")

# Patch tiktoken before cognee imports — cognee uses tiktoken for text chunking
# but tiktoken doesn't recognize Gemini model names. Register them to cl100k_base.
import tiktoken.model
tiktoken.model.MODEL_TO_ENCODING.update({
    "gemini-embedding-001": "cl100k_base",
    "gemini/gemini-embedding-001": "cl100k_base",
    "gemini-embedding-2-preview": "cl100k_base",
    "gemini/gemini-embedding-2-preview": "cl100k_base",
    "gemini-2.0-flash": "cl100k_base",
    "gemini/gemini-2.0-flash": "cl100k_base",
    "gemini-1.5-flash": "cl100k_base",
    "gemini/gemini-1.5-flash": "cl100k_base",
})

import cognee
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("cognee-bakedbot")

DEFAULT_DATASET = "cannabis_domain"


@mcp.tool()
async def kg_remember(
    data: str,
    dataset: str = DEFAULT_DATASET,
) -> str:
    """
    Store text/facts in the Cognee knowledge graph.
    Cognee extracts entities and relationships automatically.

    Args:
        data: Text, facts, or structured content to remember
        dataset: Knowledge partition (default: cannabis_domain)

    Example:
        kg_remember("OG Kush contains high myrcene and beta-caryophyllene.
                     Myrcene produces sedative, relaxing effects.")
    """
    try:
        await cognee.remember(data, dataset_name=dataset)
        return f"OK — stored in '{dataset}' knowledge graph."
    except Exception as e:
        return f"ERROR: {e}"


@mcp.tool()
async def kg_recall(
    query: str,
    top_k: int = 5,
) -> str:
    """
    Query the Cognee knowledge graph with natural language.
    Uses hybrid search: semantic similarity + graph traversal.

    Args:
        query: Natural language question or concept to search
        top_k: Max results to return

    Example:
        kg_recall("Which terpenes produce relaxing effects?")
        kg_recall("What strains work for pain and sleep?")
    """
    try:
        results = await cognee.recall(query)
        if not results:
            return "No results found."
        # Format results as readable text
        lines = []
        for i, r in enumerate(results[:top_k], 1):
            if hasattr(r, "text"):
                lines.append(f"{i}. {r.text}")
            elif hasattr(r, "content"):
                lines.append(f"{i}. {r.content}")
            elif isinstance(r, str):
                lines.append(f"{i}. {r}")
            else:
                lines.append(f"{i}. {str(r)}")
        return "\n".join(lines)
    except Exception as e:
        return f"ERROR: {e}"


@mcp.tool()
async def kg_forget(dataset: str = DEFAULT_DATASET) -> str:
    """
    Delete all data in a knowledge graph dataset.
    Use for resetting the experiment.

    Args:
        dataset: Dataset name to wipe (default: cannabis_domain)
    """
    try:
        await cognee.forget(dataset_name=dataset)
        return f"OK — '{dataset}' dataset cleared."
    except Exception as e:
        return f"ERROR: {e}"


@mcp.tool()
async def kg_status() -> str:
    """
    Check Cognee configuration and what datasets exist.
    Use this first to verify the server is configured correctly.
    """
    from cognee.infrastructure.llm.config import LLMConfig
    from cognee.infrastructure.databases.vector.config import VectorConfig

    llm = LLMConfig()
    vec = VectorConfig()

    lines = [
        "=== Cognee Experiment Status ===",
        f"LLM model:    {llm.llm_model}",
        f"LLM provider: {llm.llm_provider}",
        f"API key set:  {'yes' if (llm.llm_api_key or GEMINI_KEY) else 'NO — check GEMINI_API_KEY'}",
        f"Vector DB:    {vec.vector_db_provider}",
        f"Storage:      ~/.cognee/",
        "",
        "Tools: kg_remember, kg_recall, kg_forget, kg_status",
        "Default dataset: " + DEFAULT_DATASET,
    ]
    return "\n".join(lines)


if __name__ == "__main__":
    mcp.run(transport="stdio")
