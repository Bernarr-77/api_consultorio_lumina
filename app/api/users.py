from fastapi import APIRouter, HTTPException, Depends
from app.core.schemas import UserInput,UserOutput
from app.core.security import hash_password
from app.db.repositorio import register_user,get_user_by_id
from app.db.session import get_db
from sqlalchemy.exc import IntegrityError

router = APIRouter()

@router.post("/register_users/", response_model=UserOutput)
def user_register(payload: UserInput, db = Depends(get_db)):
    hashed = hash_password(payload.password)
    try:
        retorno = register_user(db, payload.name, payload.email,hashed)
    except IntegrityError:
        raise HTTPException(status_code= 409, detail= "Email já existente")
    except Exception as error_500:
        raise HTTPException(status_code=500, detail= f"Erro desconhecido: {str(error_500)}")
    return retorno

@router.get("/buscar_usuario/{id}",response_model=UserOutput)
def get_usuarios(id:int, db = Depends(get_db)):
    if id is None:
        raise HTTPException(status_code=400, detail="Você precisa mandar pelo menos um dado.")
    try:
        usuario = get_user_by_id(db,id)
    except Exception as error_500:
        raise HTTPException(status_code=500, detail= f"Erro desconhecido: {str(error_500)}")
    if usuario is None:
        raise HTTPException(status_code= 404, detail="Usuario não encontrado")
    return usuario