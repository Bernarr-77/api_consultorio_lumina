from app.db.models import User
from sqlalchemy.orm import Session

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