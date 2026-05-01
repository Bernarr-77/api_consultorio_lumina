from app.db.session import get_db
from fastapi import APIRouter, Depends, HTTPException,status
from app.core.schemas import UserLogin, RefreshTokenInput, ForgotPasswordInput, ResetPasswordInput
from sqlalchemy.orm import Session
from app.db.repositorio import (
    get_valid_token, get_user_by_email, get_user_by_id, 
    save_reset_code, reset_user_password
)
from app.core.security import (
    verify_password, create_access_token, create_refresh_token, 
    verify_token, gerar_codigo_recuperacao, hash_password
)
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from app.db.models import User
from app.workers.task import enviar_email_recuperacao
from datetime import datetime, timedelta, timezone

router_auth = APIRouter(tags=["Oauth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):

    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
        
    user = get_user_by_id(db, int(user_id))
    
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    return user

def require_provider(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role.value != "PROVIDER" and current_user.role != "PROVIDER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Área restrita para administrador."
        )
    return current_user

@router_auth.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user_found = get_user_by_email(db, form_data.username)
    if not user_found:
        raise HTTPException(status_code=400, detail="Email ou senha incorretos")
    verify = verify_password(form_data.password, user_found.hashed_password)
    if not verify:
        raise HTTPException(status_code=400, detail="Email ou senha incorretos")
    token_data = {"sub": str(user_found.id)}
    access_token = create_access_token(data=token_data)
    refresh_token = create_refresh_token(data=token_data, db=db)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router_auth.post("/refresh")
def refresh(refresh_data: RefreshTokenInput, db: Session = Depends(get_db)):
    token_found = get_valid_token(db=db, token_str=refresh_data.refresh_token)
    if token_found is None:
        raise HTTPException(status_code=401,detail="Não Autorizado")
    token_data = {"sub": str(token_found.user_id)}
    access_token = create_access_token(data=token_data)
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }

@router_auth.post("/forgot-password")
def forgot_password(input_data: ForgotPasswordInput, db: Session = Depends(get_db)):
    user = get_user_by_email(db, input_data.email)
    if not user:
        # Por segurança, não confirmamos se o e-mail existe ou não
        return {"message": "Se o e-mail estiver cadastrado, um código foi enviado."}
    
    codigo = gerar_codigo_recuperacao()
    expiracao = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    save_reset_code(db, input_data.email, codigo, expiracao)
    
    # Chama o Celery para enviar o e-mail
    enviar_email_recuperacao.delay(input_data.email, codigo)
    
    return {"message": "Se o e-mail estiver cadastrado, um código foi enviado."}


@router_auth.post("/reset-password")
def reset_password(input_data: ResetPasswordInput, db: Session = Depends(get_db)):
    hashed_password = hash_password(input_data.new_password)
    
    success = reset_user_password(
        db, 
        input_data.email, 
        input_data.code, 
        hashed_password
    )
    
    if not success:
        raise HTTPException(
            status_code=400, 
            detail="Código inválido, expirado ou e-mail incorreto."
        )
    
    return {"message": "Senha alterada com sucesso!"}

    

