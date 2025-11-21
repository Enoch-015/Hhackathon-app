from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status

from ..config import Settings, get_settings
from ..models.schemas import (
    NavigationDecisionRequest,
    NavigationDecisionResponse,
    NavigationDestinationRequest,
    NavigationDestinationResponse,
)
from ..services.navigation import NavigationStateStore, get_navigation_store

router = APIRouter(prefix="/navigation", tags=["navigation"])


def _authorize(settings: Settings, authorization: str | None) -> None:
    if settings.vision_api_token and authorization != f"Bearer {settings.vision_api_token}":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid vision token")


@router.post("/decision", response_model=NavigationDecisionResponse)
def submit_decision(
    payload: NavigationDecisionRequest,
    store: NavigationStateStore = Depends(get_navigation_store),
    settings: Settings = Depends(get_settings),
    authorization: str | None = Header(default=None),
) -> NavigationDecisionResponse:
    _authorize(settings, authorization)
    entry = store.record_decision(
        room=payload.room,
        command=payload.command,
        message=payload.message,
        confidence=payload.confidence,
        source=payload.source,
    )
    return NavigationDecisionResponse(**entry.__dict__)


@router.get("/decision/latest", response_model=NavigationDecisionResponse)
def latest_decision(
    room: str,
    store: NavigationStateStore = Depends(get_navigation_store),
) -> NavigationDecisionResponse:
    entry = store.get_latest_decision(room)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No decision available")
    return NavigationDecisionResponse(**entry.__dict__)


@router.post("/destination", response_model=NavigationDestinationResponse)
def set_destination(
    payload: NavigationDestinationRequest,
    store: NavigationStateStore = Depends(get_navigation_store),
) -> NavigationDestinationResponse:
    entry = store.set_destination(
        room=payload.room,
        latitude=payload.latitude,
        longitude=payload.longitude,
        label=payload.label,
        requested_by=payload.requested_by,
    )
    return NavigationDestinationResponse(**entry.__dict__)


@router.get("/destination/{room}", response_model=NavigationDestinationResponse)
def get_destination(
    room: str,
    store: NavigationStateStore = Depends(get_navigation_store),
) -> NavigationDestinationResponse:
    entry = store.get_destination(room)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination not set")
    return NavigationDestinationResponse(**entry.__dict__)


@router.delete("/destination/{room}", status_code=status.HTTP_204_NO_CONTENT)
def clear_destination(room: str, store: NavigationStateStore = Depends(get_navigation_store)) -> None:
    store.clear_destination(room)
