import sys
import traceback as tb

_import_error = None

try:
    from app.main import app
except Exception:
    _import_error = tb.format_exc()
    tb.print_exc(file=sys.stderr)

    from fastapi import FastAPI, Request
    from fastapi.responses import PlainTextResponse

    app = FastAPI()

    @app.get("/{path:path}")
    @app.post("/{path:path}")
    @app.put("/{path:path}")
    @app.delete("/{path:path}")
    async def error_handler(request: Request, path: str):
        return PlainTextResponse(_import_error or "Unknown error", status_code=500)
