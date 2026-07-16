import asyncio
from app.integrations.supabase.client import get_supabase_admin_client

USUARIOS = [
    {"dni": "44444444", "email": "luciaperez@kinePro.com"},
    {"dni": "44710154", "email": "ezeweber2003@gmail.com"},
]


def main():
    client = get_supabase_admin_client()
    for u in USUARIOS:
        users = client.auth.admin.list_users()
        target = next((usr for usr in users if usr.email == u["email"]), None)
        if not target:
            print(f"No se encontro usuario para {u['email']}")
            continue
        client.auth.admin.update_user_by_id(
            target.id,
            {"password": u["dni"]},
        )
        print(f"Reset password para {u['email']}: OK")


if __name__ == "__main__":
    main()
