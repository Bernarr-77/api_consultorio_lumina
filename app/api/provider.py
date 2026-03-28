from fastapi import APIRouter, HTTPException, Depends
from app.core.schemas import ProviderInput, ProviderOutput,ProvidersPatch
from app.db.repositorio import register_provider,get_all_providers, get_provider_by_id, delete_provider,atualizar_provider, reativar_provider
from app.db.session import get_db
from typing import Optional, List


router_provider = APIRouter()

@router_provider.post("/register_provider/",  response_model=ProviderOutput)
def cadastrar_provider(dados: ProviderInput, db = Depends(get_db)):
    try:
        provider = register_provider(db,dados.user_id,dados.bio,dados.specialty)
        if provider is None:
            raise HTTPException(status_code=404, detail="Não existe usuario cadastrado")
    except Exception as error_500:
        raise HTTPException(status_code=500, detail= f"Erro desconhecido: {str(error_500)}")
    return provider

@router_provider.get("/buscar_providers/", response_model=List[ProviderOutput])
def buscar_todos(especialidade: Optional[str] = None, db = Depends(get_db)):
    try:
        resultado = get_all_providers(db, especialidade)
        if resultado is None:
            raise HTTPException(status_code=404, detail="Nenhum provider encontrado")
    except Exception as error_500:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(error_500)}")
    return resultado

@router_provider.get("/buscar_id/{id}", response_model=ProviderOutput)
def buscar_pelo_id(id: int, db = Depends(get_db)):
    try:
        retorno = get_provider_by_id(db, id)
        if retorno is None:
            raise HTTPException(status_code=404, detail= "Não existe providers com esse id")
    except Exception as error_500:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(error_500)}")
    return retorno

@router_provider.delete("/deletar_provedor/")
def apagar_provedor(id_provedor, db = Depends(get_db)):
    try:
        apagador = delete_provider(db, id_provedor)
        if apagador is None:
            raise HTTPException(status_code=404, detail= "Nenhum provider encontrado")   
    except Exception as error_500:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(error_500)}")
    return apagador

@router_provider.patch("/atualizar_provider/{id}", response_model= ProviderOutput)
def atualizar_provedor(dados: ProvidersPatch, id: int,  db = Depends(get_db)):
    if dados.bio is None and dados.specialty is None:
        raise HTTPException(status_code= 400, detail= "Deve ter pelo menos um dado a ser enviado")
    try:
        resultado = atualizar_provider(db, id, dados.bio, dados.specialty)
        if resultado is None:
            raise HTTPException(status_code=404, detail= "Nenhum provider encontrado ou esta inativo") 
    except Exception as error_500:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(error_500)}")
    return resultado

@router_provider.patch("/reativar_provider/{id}", response_model=ProviderOutput)
def reativacao_provider(id, db = Depends(get_db)):
    try:
        reativacao = reativar_provider(db, id)
        if reativacao is None:
            raise HTTPException(status_code=404, detail= "Nenhum provider inativo encontrado") 
    except Exception as error_500:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(error_500)}")
    return reativacao