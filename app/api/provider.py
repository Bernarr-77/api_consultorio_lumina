from fastapi import APIRouter, HTTPException, Depends, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional, List
from app.api.auth import require_provider, get_current_user
from app.core.schemas import ProviderInput, ProviderOutput, ProvidersPatch
from app.db.repositorio import (
    register_provider,
    get_all_providers,
    get_provider_by_id,
    deactivate_provider,
    update_provider,
    reactivate_provider,
)
from app.db.session import get_db

router_provider = APIRouter(prefix="/providers", 
                            tags=["Providers"])


@router_provider.post("/", response_model=ProviderOutput,)
def register_provider_route(payload: ProviderInput, db: Session = Depends(get_db)):
    """Registra um novo provider a partir de um usuário existente."""
    try:
        provider = register_provider(db, payload.user_id, payload.bio, payload.specialty)
        if provider is None:
            raise HTTPException(status_code=404, detail="Não existe usuário cadastrado com esse ID")
    except HTTPException:
        raise
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Conflito de dados únicos")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return provider


@router_provider.get("/", response_model=List[ProviderOutput],dependencies=[Depends(get_current_user)])
def get_all_providers_route(specialty: Optional[str] = Query(None, min_length=1, max_length=100), db: Session = Depends(get_db)):
    """Busca todos os providers ativos, com filtro opcional por especialidade."""
    try:
        providers = get_all_providers(db, specialty)
        if providers is None:
            raise HTTPException(status_code=404, detail="Nenhum provider encontrado")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return providers


@router_provider.get("/{provider_id}", response_model=ProviderOutput,dependencies=[Depends(require_provider)])
def get_provider_by_id_route(provider_id: int = Path(..., gt=0, le=2147483647), db: Session = Depends(get_db)):
    """Busca um provider ativo pelo ID."""
    try:
        provider = get_provider_by_id(db, provider_id)
        if provider is None:
            raise HTTPException(status_code=404, detail="Não existe provider com esse ID")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return provider


@router_provider.delete("/{provider_id}", dependencies=[Depends(require_provider)])
def deactivate_provider_route(provider_id: int = Path(..., gt=0, le=2147483647), db: Session = Depends(get_db)):
    """Soft-delete: marca o provider como INATIVO."""
    try:
        result = deactivate_provider(db, provider_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Nenhum provider encontrado")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return result


@router_provider.patch("/{provider_id}", response_model=ProviderOutput, dependencies=[Depends(require_provider)])
def update_provider_route(provider_id: int = Path(..., gt=0, le=2147483647), payload: ProvidersPatch = None, db: Session = Depends(get_db)):
    """Atualiza bio e/ou especialidade de um provider ativo."""
    if payload.bio is None and payload.specialty is None:
        raise HTTPException(status_code=400, detail="Deve enviar pelo menos um campo para atualizar")
    try:
        provider = update_provider(db, provider_id, payload.bio, payload.specialty)
        if provider is None:
            raise HTTPException(status_code=404, detail="Nenhum provider encontrado ou está inativo")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return provider


@router_provider.patch("/{provider_id}/reactivate", response_model=ProviderOutput, dependencies=[Depends(require_provider)])
def reactivate_provider_route(provider_id: int = Path(..., gt=0, le=2147483647), db: Session = Depends(get_db)):
    """Reativa um provider inativo."""
    try:
        provider = reactivate_provider(db, provider_id)
        if provider is None:
            raise HTTPException(status_code=404, detail="Nenhum provider inativo encontrado")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return provider