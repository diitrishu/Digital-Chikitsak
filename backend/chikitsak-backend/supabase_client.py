import os
from dotenv import load_dotenv

load_dotenv()

_client = None

def get_supabase():
    """Get or create the Supabase client (lazy singleton)."""
    global _client
    if _client is None:
        supabase_url = os.getenv("SUPABASE_URL")
        # Prefer service role key (bypasses RLS), fall back to publishable key
        supabase_key = (
            os.getenv("SUPABASE_SERVICE_KEY") or
            os.getenv("SUPABASE_SERVICE_ROLE_KEY") or
            os.getenv("SUPABASE_PUBLISHABLE_KEY")
        )
        if not supabase_url or not supabase_key:
            raise RuntimeError("SUPABASE_URL and a Supabase key must be set")
        from supabase import create_client
        _client = create_client(supabase_url, supabase_key)
    return _client
