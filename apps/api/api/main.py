from __future__ import annotations

import datetime as dt

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .models.schemas import HealthResponse
from .routers import livekit, navigation, tts


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Vision Navigation API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", response_model=HealthResponse)
    def healthcheck() -> HealthResponse:  # pragma: no cover - trivial
        return HealthResponse(status="ok", timestamp=dt.datetime.now(dt.timezone.utc))

    app.include_router(livekit.router, prefix=settings.api_prefix)
    app.include_router(navigation.router, prefix=settings.api_prefix)
    app.include_router(tts.router, prefix=settings.api_prefix)
    return app


app = create_app()
