from fastapi import FastAPI
from app.api.users import router_user
from app.api.provider import router_provider
from app.api.services import router_service

app = FastAPI()

app.include_router(router_user)
app.include_router(router_provider)
app.include_router(router_service)

