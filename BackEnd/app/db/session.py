
# app/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=True,  # Cambiá a False en producción
    pool_pre_ping=True,  # descarta conexiones muertas antes de usarlas (evita "connection is closed")
    pool_recycle=1800,   # recicla conexiones inactivas antes de que Postgres/el host las cierre
    connect_args={
        "prepared_statement_cache_size": 0,  # caché de SQLAlchemy
        "statement_cache_size": 0,            # caché nativo de asyncpg
    },
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session