from app.db.models import User,Provider,Service,StatusProvider
from sqlalchemy.orm import Session
from sqlalchemy import select,delete
from typing import Optional

def register_user(db: Session ,nome,mail,password,new_role = "CLIENT"):
        new_user = User(name=nome,email=mail,
                        hashed_password=password,role=new_role)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

def get_user_by_id(db: Session, id:int):
        usuario = db.get(User, id)
        if usuario:
                return usuario
        else: 
                return None
        
def register_provider(db: Session, id: int, biografia, especialidade, provider_role = "PROVIDER"):
        user = db.get(User, id)
        if user:
                user.role = provider_role
                db.commit()
                new_provider = Provider(user_id=id,bio=biografia, specialty=especialidade)
                db.add(new_provider)
                db.commit()
                db.refresh(new_provider)
                return new_provider
        else:
                return None
def get_all_providers(db: Session, especialidade: Optional[str] = None):
        query = select(Provider).where(Provider.operando == StatusProvider.ATIVO)
        if especialidade is not None:
                query = query.filter(Provider.specialty.ilike(f'%{especialidade}%'))
                resultados = db.scalars(query).all()
                if resultados:
                        return resultados
                return None
        resultados = db.scalars(query).all()
        if resultados:
                return resultados
        return None

def get_provider_by_id(db: Session,id: int):
        query = select(Provider).where(Provider.operando == StatusProvider.ATIVO, Provider.id == id)
        resultado = db.scalars(query).first()
        
        if resultado:
                return resultado
        return None

def reativar_provider(db:Session, id_provider):
        query = select(Provider).where(Provider.operando == StatusProvider.INATIVO, Provider.id == id_provider)
        buscar = db.scalars(query).first()
        if buscar:
                buscar.operando = StatusProvider.ATIVO
                db.commit()
                return buscar
        return None

def delete_provider(db: Session, id):
        verificador = get_provider_by_id(db,id)
        if verificador is None:
                return None
        verificador.operando = StatusProvider.INATIVO
        db.commit()
        return 'Provider inativo com sucesso '

def atualizar_provider(db:Session, id, biografia: Optional[str] = None, especialidade: Optional[str] = None):
        verificador = get_provider_by_id(db, id)
        if verificador is None:
                return None
        if biografia is not None:
                verificador.bio = biografia
        if especialidade is not None:
                verificador.specialty = especialidade
        db.commit()
        return verificador


def criar_services(db: Session, id: int, name, duracao, price:float):
        provedor = get_provider_by_id(db, id)
        if provedor is None:
                return None
        servico = Service(provider_id=id, name=name,
                          duration_minutes=duracao,price=price)
        db.add(servico)
        db.commit()
        db.refresh(servico)
        return servico

def buscar_servicos(db: Session, id_provider):
        query = select(Service).where(Service.provider_id == id_provider)
        resultado = db.scalars(query).all()
        if resultado:
                return resultado
        return None
