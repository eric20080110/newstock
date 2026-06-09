import sys
import traceback

try:
    from app.main import app
except Exception:
    traceback.print_exc(file=sys.stderr)
    from fastapi import FastAPI, Request
    from fastapi.responses import PlainTextResponse

    app = FastAPI()

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    async def error_handler(request: Request, path: str):
        return PlainTextResponse(traceback.format_exc(), status_code=500)
