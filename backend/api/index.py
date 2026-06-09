import importlib
import sys
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
async def handler(request: Request, path: str):
    if path == "health":
        return {"status": "ok", "loader": "active"}

    try:
        mod = importlib.import_module("app.main")
        real_app = getattr(mod, "app")
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "import_error": str(e),
                "traceback": traceback.format_exc(),
                "sys_path": sys.path,
            },
        )

    scope = {
        "type": "http",
        "method": request.method,
        "path": f"/{path}",
        "headers": [(k.lower().encode(), v.encode()) for k, v in request.headers.items()],
        "query_string": request.url.query.encode(),
        "client": ("0.0.0.0", 0),
        "server": ("vercel", 443),
        "scheme": request.url.scheme,
    }

    async def receive():
        return {"type": "http.request", "body": await request.body(), "more_body": False}

    status_code = 200
    resp_headers = []
    body = b""

    async def send(message):
        nonlocal status_code, resp_headers, body
        if message["type"] == "http.response.start":
            status_code = message["status"]
            resp_headers = message["headers"]
        elif message["type"] == "http.response.body":
            body = message["body"]

    try:
        await real_app(scope, receive, send)
        from fastapi.responses import Response

        return Response(
            content=body,
            status_code=status_code,
            headers={k.decode(): v.decode() for k, v in resp_headers},
        )
    except Exception:
        return JSONResponse(
            status_code=500,
            content={"runtime_error": traceback.format_exc()},
        )
