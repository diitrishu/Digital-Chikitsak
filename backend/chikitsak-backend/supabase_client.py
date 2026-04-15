import os
from dotenv import load_dotenv

load_dotenv()

_client = None

def get_supabase():
    """Get or create the Supabase client (lazy singleton)."""
    global _client
    if _client is None:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_PUBLISHABLE_KEY")
        if not supabase_url or not supabase_key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set")
        from supabase import create_client
        _client = create_client(supabase_url, supabase_key)
    return _client
