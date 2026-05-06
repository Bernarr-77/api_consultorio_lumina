from fastapi import APIRouter, HTTPException, Depends, Path
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from app.api.auth import require_provider
from app.core.schemas import ServiceInput, ServiceOutput, ServicePatch
from app.db.repositorio import (
    create_service,
    get_services_by_provider,
    get_provider_by_id,
    update_service,
    delete_service,
)
from app.db.session import get_db

router_service = APIRouter(prefix="/services", 
                            tags=["Services"])


@router_service.post("/", response_model=ServiceOutput, dependencies=[Depends(require_provider)])
def create_service_route(payload: ServiceInput, db: Session = Depends(get_db)):
    """Cria um novo serviço vinculado a um provider ativo."""
    try:
        service = create_service(
            db, payload.provider_id, payload.name, payload.duration_minutes, payload.price, payload.category
        )
        if service is None:
            raise HTTPException(status_code=404, detail="Não existe provider com esse ID")
    except HTTPException:
        raise
    except IntegrityError:
        raise HTTPException(status_code=409, detail="Conflito de dados únicos")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return service


@router_service.get("/{provider_id}", response_model=List[ServiceOutput])
def get_services_route(provider_id: int = Path(..., gt=0, le=2147483647), db: Session = Depends(get_db)):
    """Busca todos os serviços de um provider ativo."""
    try:
        provider = get_provider_by_id(db, provider_id)
        if provider is None:
            raise HTTPException(status_code=404, detail="Não existe provider com esse ID")
        services = get_services_by_provider(db, provider_id)
        if services is None:
            raise HTTPException(status_code=404, detail="Nenhum serviço encontrado para esse provider")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return services


@router_service.patch("/{provider_id}/{service_id}", response_model=ServiceOutput, dependencies=[Depends(require_provider)])
def update_service_route(
    provider_id: int = Path(..., gt=0, le=2147483647),
    service_id: int = Path(..., gt=0, le=2147483647),
    payload: ServicePatch = None,
    db: Session = Depends(get_db),
):
    """Atualiza campos de um serviço existente."""
    try:
        service = update_service(
            db, provider_id, service_id, payload.name, payload.duration_minutes, payload.price, payload.category
        )
        if service is None:
            raise HTTPException(
                status_code=404,
                detail="Serviço não encontrado ou provider inativo/inexistente",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return service


@router_service.delete("/{provider_id}/{service_id}", status_code=204, dependencies=[Depends(require_provider)])
def delete_service_route(
    provider_id: int = Path(..., gt=0, le=2147483647),
    service_id: int = Path(..., gt=0, le=2147483647),
    db: Session = Depends(get_db),
):
    """Exclui um serviço existente."""
    try:
        deleted = delete_service(db, provider_id, service_id)
        if not deleted:
            raise HTTPException(
                status_code=404,
                detail="Serviço não encontrado",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return None