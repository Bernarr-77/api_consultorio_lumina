from app.db.session import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Enum, ForeignKey
import enum
from datetime import datetime
class StatusUsuario(enum.Enum):
    CLIENT = "client"
    PROVIDER = "provider"

class User(Base):
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column(primary_key=True,autoincrement=True)
    name: Mapped[str] = mapped_column(String(40), nullable= False)
    email:Mapped[str] = mapped_column(unique=True,nullable= False)
    hashed_password: Mapped[str] = mapped_column(nullable=False)
    role: Mapped[str] = mapped_column(Enum(StatusUsuario),nullable=False)
    created_at:Mapped[datetime] = mapped_column(default=datetime.now)
    provider: Mapped["Provider"] = relationship(back_populates="user")

class Provider(Base):
    __tablename__ = "providers"
    id: Mapped[int] = mapped_column(primary_key= True, autoincrement= True)
    user_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    bio: Mapped[str] = mapped_column(nullable=False)
    specialty: Mapped[str] = mapped_column(nullable=False)
    user: Mapped["User"]= relationship(back_populates="provider")
