import sys
import traceback

try:
    from app.main import app
except Exception:
    traceback.print_exc(file=sys.stderr)
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse

    app = FastAPI()

    @app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
    async def error_handler(request: Request, path: str):
        return JSONResponse(
            status_code=500,
            content={
                "error": "App failed to load",
                "detail": traceback.format_exc(),
            },
        )
