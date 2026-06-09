from contextlib import asynccontextmanager

from fastapi import FastAPI
from starlette.responses import Response

from munger.api.router import router
from munger.core.config import settings


class CORSMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        if scope["method"] == "OPTIONS":
            await send({
                "type": "http.response.start",
                "status": 200,
                "headers": [
                    (b"access-control-allow-origin", b"*"),
                    (b"access-control-allow-methods", b"*"),
                    (b"access-control-allow-headers", b"*"),
                    (b"access-control-max-age", b"86400"),
                    (b"content-length", b"0"),
                ],
            })
            await send({
                "type": "http.response.body",
                "body": b"",
            })
            return

        async def send_with_cors(message):
            if message["type"] == "http.response.start":
                existing = dict(message.get("headers", []))
                if b"access-control-allow-origin" not in existing:
                    message["headers"] = list(message.get("headers", [])) + [
                        (b"access-control-allow-origin", b"*"),
                    ]
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
app.add_middleware(CORSMiddleware)
app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}
