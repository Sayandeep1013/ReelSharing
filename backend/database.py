from supabase import create_client, Client
from config import settings

# Service role client — used by backend only, bypasses RLS
# Never expose this to the frontend
supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
)


def get_supabase() -> Client:
    return supabase
