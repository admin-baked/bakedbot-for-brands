"""
Seed script for the Cognee experiment.
Loads a representative set of cannabis domain facts into the knowledge graph:
  - 12 common strains with effects and terpene profiles
  - 8 major terpenes with effects and aroma
  - Strain → terpene and strain → effect relationships

Run: python scripts/cognee-experiment/seed_cannabis.py

This takes ~2-4 minutes to process (cognee builds graph + embeddings).
Watch for "Seeding complete" at the end.
"""

import asyncio
import os
import sys

# Load .env.local
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

GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")
os.environ.setdefault("LLM_API_KEY", GEMINI_KEY)
os.environ.setdefault("LLM_MODEL", "gemini/gemini-2.0-flash")
os.environ.setdefault("EMBEDDING_MODEL", "gemini/gemini-embedding-001")
os.environ.setdefault("EMBEDDING_API_KEY", GEMINI_KEY)
os.environ.setdefault("ENABLE_BACKEND_ACCESS_CONTROL", "false")
os.environ.setdefault("COGNEE_SKIP_CONNECTION_TEST", "true")

# Patch tiktoken before cognee imports — cognee uses tiktoken to tokenize text
# for chunking, but tiktoken doesn't know Gemini model names. Register them to
# the cl100k_base encoding (same BPE used by GPT-4, close enough for chunking).
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

DATASET = "cannabis_domain"

# ─── Terpene knowledge ──────────────────────────────────────────────────────

TERPENES = """
Myrcene is the most common terpene in cannabis. It produces earthy, musky, clove-like aromas.
Myrcene effects: sedative, relaxing, anti-inflammatory, couch-lock at high concentrations.
Strains high in myrcene: OG Kush, Blue Dream, Granddaddy Purple, Mango Kush.

Beta-caryophyllene is the only terpene that also acts as a cannabinoid, binding to CB2 receptors.
Beta-caryophyllene produces spicy, peppery, woody aromas.
Beta-caryophyllene effects: anti-inflammatory, pain relief, stress reduction, gastroprotective.
Strains high in beta-caryophyllene: Girl Scout Cookies, Sour Diesel, Bubba Kush.

Limonene produces citrus, lemon, orange aromas.
Limonene effects: mood elevation, stress relief, anti-anxiety, antidepressant.
Strains high in limonene: Super Lemon Haze, Durban Poison, Jack Herer, Lemon Haze.

Linalool produces floral, lavender aromas.
Linalool effects: calming, anti-anxiety, sedative, pain relief, anti-epileptic.
Strains high in linalool: Lavender, Amnesia Haze, LA Confidential, Do-Si-Dos.

Pinene (alpha-pinene and beta-pinene) produces pine, fresh forest aromas.
Pinene effects: alertness, memory retention, counteracts THC-induced memory impairment, anti-inflammatory, bronchodilator.
Strains high in pinene: Jack Herer, Blue Dream, OG Kush, Romulan.

Terpinolene produces floral, herbal, woody, citrus aromas.
Terpinolene effects: relaxing, antioxidant, anti-cancer properties under study.
Strains high in terpinolene: Jack Herer, Ghost Train Haze, XJ-13, Dutch Treat.

Ocimene produces sweet, herbal, woody aromas.
Ocimene effects: uplifting, antiviral, antifungal.
Strains high in ocimene: Strawberry Cough, Clementine, Golden Goat.

Humulene produces earthy, woody, hoppy aromas (same terpene in hops).
Humulene effects: appetite suppressant, anti-inflammatory, antibacterial.
Strains high in humulene: Girl Scout Cookies, Headband, White Widow.
"""

# ─── Strain knowledge ───────────────────────────────────────────────────────

STRAINS = """
OG Kush is an indica-dominant hybrid (55% indica, 45% sativa). THC: 20-25%. CBD: <1%.
OG Kush aroma: earthy, pine, woody with hints of lemon and fuel.
OG Kush effects: euphoric, happy, relaxing, uplifted, hungry.
OG Kush best for: stress relief, depression, pain, insomnia.
OG Kush dominant terpenes: myrcene, limonene, beta-caryophyllene, pinene.

Blue Dream is a sativa-dominant hybrid (60% sativa, 40% indica). THC: 17-24%. CBD: 2%.
Blue Dream aroma: sweet berry, blueberry, vanilla.
Blue Dream effects: creative, euphoric, energetic, focused, relaxed.
Blue Dream best for: depression, chronic pain, nausea, headaches.
Blue Dream dominant terpenes: myrcene, pinene, caryophyllene.

Granddaddy Purple (GDP) is a pure indica strain. THC: 17-23%. CBD: 0.1%.
GDP aroma: grape, berry, lavender, earthy.
GDP effects: deeply relaxing, sedating, euphoric, happy.
GDP best for: insomnia, pain, muscle spasms, stress, anxiety.
GDP dominant terpenes: myrcene, caryophyllene, pinene.

Girl Scout Cookies (GSC) is an indica-dominant hybrid (60% indica, 40% sativa). THC: 19-28%.
GSC aroma: sweet, earthy, mint, pungent.
GSC effects: euphoric, relaxing, creative, hungry.
GSC best for: appetite stimulation, nausea, chronic pain, depression.
GSC dominant terpenes: caryophyllene, limonene, humulene.

Sour Diesel is a sativa-dominant strain (90% sativa). THC: 18-26%.
Sour Diesel aroma: diesel, pungent, earthy, citrus.
Sour Diesel effects: energetic, creative, euphoric, focused, uplifted.
Sour Diesel best for: depression, stress, fatigue, anxiety.
Sour Diesel dominant terpenes: myrcene, limonene, caryophyllene.

Jack Herer is a sativa-dominant hybrid. THC: 18-23%.
Jack Herer aroma: pine, earthy, woody, spicy.
Jack Herer effects: energetic, happy, creative, focused, uplifted.
Jack Herer best for: fatigue, stress, depression, lack of appetite.
Jack Herer dominant terpenes: terpinolene, pinene, ocimene.

White Widow is a balanced hybrid (50/50). THC: 18-25%.
White Widow aroma: earthy, woody, spicy, sweet.
White Widow effects: energetic, euphoric, happy, creative, conversational.
White Widow best for: stress, depression, fatigue, pain.
White Widow dominant terpenes: myrcene, caryophyllene, limonene, humulene.

Northern Lights is a pure indica strain. THC: 16-21%.
Northern Lights aroma: sweet, spicy, pine, earthy.
Northern Lights effects: deeply relaxing, sedating, happy, sleepy.
Northern Lights best for: insomnia, pain, stress, depression.
Northern Lights dominant terpenes: myrcene, caryophyllene, pinene.

Wedding Cake (Triangle Mints #23) is an indica-dominant hybrid. THC: 22-27%.
Wedding Cake aroma: sweet, vanilla, earthy, pepper.
Wedding Cake effects: relaxing, euphoric, happy, uplifted, aroused.
Wedding Cake best for: anxiety, insomnia, appetite, pain.
Wedding Cake dominant terpenes: caryophyllene, limonene, myrcene.

Durban Poison is a pure sativa landrace strain. THC: 16-20%.
Durban Poison aroma: sweet, anise, pine, earthy.
Durban Poison effects: energetic, uplifting, euphoric, creative, focused.
Durban Poison best for: fatigue, depression, stress, ADHD.
Durban Poison dominant terpenes: terpinolene, myrcene, ocimene, limonene.

Do-Si-Dos is an indica-dominant hybrid. THC: 19-30%.
Do-Si-Dos aroma: floral, earthy, sweet, lime.
Do-Si-Dos effects: deeply relaxing, euphoric, sedating, happy.
Do-Si-Dos best for: anxiety, insomnia, pain, PTSD.
Do-Si-Dos dominant terpenes: linalool, limonene, caryophyllene.

Pineapple Express is a sativa-dominant hybrid. THC: 19-25%.
Pineapple Express aroma: pineapple, tropical fruit, cedar, pine.
Pineapple Express effects: energetic, euphoric, creative, happy, focused.
Pineapple Express best for: fatigue, stress, mild pain, depression.
Pineapple Express dominant terpenes: ocimene, myrcene, caryophyllene.
"""

# ─── Effect → use-case mapping ───────────────────────────────────────────────

USE_CASES = """
For customers seeking sleep help (insomnia), recommend indica strains high in myrcene and linalool.
Best strains for insomnia: Granddaddy Purple, Northern Lights, Wedding Cake, Do-Si-Dos.

For customers seeking pain relief, recommend strains high in beta-caryophyllene and myrcene.
Best strains for pain: OG Kush, Blue Dream, Girl Scout Cookies, Northern Lights, Granddaddy Purple.

For customers seeking anxiety relief, recommend strains with linalool, limonene, and moderate THC.
Best strains for anxiety: Do-Si-Dos, Granddaddy Purple, White Widow, Blue Dream.

For customers seeking energy and focus (daytime use), recommend sativa strains with terpinolene and limonene.
Best strains for energy: Sour Diesel, Jack Herer, Durban Poison, Pineapple Express.

For customers seeking creativity and social effects, recommend hybrid strains with limonene.
Best strains for creativity: Blue Dream, White Widow, Jack Herer, Pineapple Express.

For customers seeking appetite stimulation, recommend indica-dominant strains with myrcene.
Best strains for appetite: Girl Scout Cookies, Granddaddy Purple, OG Kush, Northern Lights.

High-THC strains (25%+): Wedding Cake, Girl Scout Cookies, Do-Si-Dos. Recommend for experienced users.
Low-THC strains for beginners: Blue Dream, White Widow, Jack Herer.
"""


async def main():
    print("=== Cognee Cannabis Knowledge Graph Seed ===")
    print(f"LLM: {os.environ.get('LLM_MODEL', 'not set')}")
    print(f"Gemini key: {'set' if GEMINI_KEY else 'MISSING — add GEMINI_API_KEY to .env.local'}")
    print()

    if not GEMINI_KEY:
        print("ERROR: GEMINI_API_KEY not found. Aborting.")
        sys.exit(1)

    chunks = [
        ("Terpene knowledge", TERPENES),
        ("Strain knowledge", STRAINS),
        ("Effect-to-use-case mapping", USE_CASES),
    ]

    for label, text in chunks:
        print(f"Seeding: {label}...")
        await cognee.remember(text, dataset_name=DATASET)
        print(f"  [ok] Done")

    print()
    print("=== Seeding complete ===")
    print(f"Dataset: {DATASET}")
    print()
    print("Test queries to try via kg_recall:")
    print('  kg_recall("Which strains are good for insomnia?")')
    print('  kg_recall("What terpenes help with anxiety?")')
    print('  kg_recall("Best strains for daytime focus and energy")')


if __name__ == "__main__":
    asyncio.run(main())
