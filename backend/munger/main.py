from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from munger.api.router import router
from munger.core.config import settings


CORS_HEADERS = [
    (b"access-control-allow-origin", b"*"),
    (b"access-control-allow-headers", b"*"),
    (b"access-control-allow-methods", b"*"),
]


class RawCORSMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_cors(message):
            if message["type"] == "http.response.start":
                existing = dict(message.get("headers", []))
                for k, v in CORS_HEADERS:
                    if k not in existing:
                        message["headers"] = list(message.get("headers", [])) + [(k, v)]
            await send(message)

        await self.app(scope, receive, send_with_cors)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.env != "development":
        from alembic.config import Config as AlembicConfig
        from alembic import command
        alembic_cfg = AlembicConfig("alembic.ini")
        command.upgrade(alembic_cfg, "head")
    yield


app = FastAPI(title="Munger Portfolio", version="0.1.0", lifespan=lifespan)
app.add_middleware(RawCORSMiddleware)

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
allow_creds = origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}
