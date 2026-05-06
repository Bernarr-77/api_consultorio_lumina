from fastapi import FastAPI
import os
from app.api.users import router_user
from app.api.provider import router_provider
from app.api.services import router_service
from app.api.agendamentos import router_agendamentos
from app.api.auth import router_auth
from app.api.finance import router_finance
from fastapi.middleware.cors import CORSMiddleware

from fastapi.staticfiles import StaticFiles

app = FastAPI(title="Agendamento API", version="1.0.0")

# Verifica se estamos na Vercel (onde o sistema de arquivos é read-only)
IS_VERCEL = os.environ.get("VERCEL") == "1"

if not IS_VERCEL:
    os.makedirs("uploads", exist_ok=True)
    app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
else:
    try:
        if os.path.exists("uploads"):
            app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
    except Exception:
        pass

origins = [
    "http://localhost",
    "http://localhost:3000",   
    "http://localhost:5173",   
    "http://localhost:8080",
]

# 2. Configurando o Porteiro Global
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Permite todas as origens para o MVP na nuvem
    allow_credentials=True,    # Permite que o Front-end envie cookies/tokens
    allow_methods=["*"],       # Permite todos os métodos (GET, POST, DELETE, etc.)
    allow_headers=["*"],       # Permite todos os cabeçalhos (essencial para o nosso Authorization: Bearer token)
)
app.include_router(router_user)
app.include_router(router_provider)
app.include_router(router_service)
app.include_router(router_agendamentos)
app.include_router(router_auth)
app.include_router(router_finance)
