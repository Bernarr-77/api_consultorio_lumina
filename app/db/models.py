from app.db.session import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Enum, ForeignKey
import enum
from datetime import datetime
class StatusUsuario(enum.Enum):
    CLIENT = "CLIENT"
    PROVIDER = "PROVIDER"
class Status(enum.Enum):
    PENDENTE = 'PENDENTE'
    CONFIRMADO = 'CONFIRMADO'
    CANCELADO = 'CANCELADO'

class StatusProvider(enum.Enum):
    ATIVO = 'ATIVO'
    INATIVO = 'INATIVO'

class User(Base):
    __tablename__ = "usuarios"
    id: Mapped[int] = mapped_column(primary_key=True,autoincrement=True)
    name: Mapped[str] = mapped_column(String(40), nullable= False)
    email:Mapped[str] = mapped_column(unique=True,nullable= False)
    hashed_password: Mapped[str] = mapped_column(nullable=False)
    role: Mapped[StatusUsuario] = mapped_column(Enum(StatusUsuario),nullable=False)
    created_at:Mapped[datetime] = mapped_column(default=datetime.now)

    provider: Mapped["Provider"] = relationship(back_populates="user")
    agendamento: Mapped[list['Appointments']] = relationship(back_populates='agendamento_usuario')

class Provider(Base):
    __tablename__ = "providers"
    id: Mapped[int] = mapped_column(primary_key= True, autoincrement= True)
    user_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    bio: Mapped[str] = mapped_column(nullable=False)
    specialty: Mapped[str] = mapped_column(nullable=False)
    operando: Mapped[StatusProvider] = mapped_column(Enum(StatusProvider),nullable=False,server_default='ATIVO')

    user: Mapped["User"]= relationship(back_populates="provider")
    service: Mapped[list["Service"]] = relationship(back_populates="service_provider",cascade='all, delete-orphan')
    @property
    def name(self):
        return self.user.name

class Service(Base):
    __tablename__ = "servicos"
    id: Mapped[int] = mapped_column(primary_key= True, autoincrement= True)
    provider_id: Mapped[int] = mapped_column(ForeignKey("providers.id"))
    name: Mapped[str] = mapped_column(nullable=False)
    duration_minutes: Mapped[int] = mapped_column(nullable=False)
    price: Mapped[float] = mapped_column(nullable=False)

    service_provider: Mapped["Provider"] = relationship(back_populates='service')
    servicos_agendados: Mapped[list['Appointments']] = relationship(back_populates='agendamento_servico',cascade='all, delete-orphan')
    @property
    def nome(self):
        return self.service_provider.user.name

class Appointments(Base):
    __tablename__ = "agendamentos"
    id: Mapped[int] = mapped_column(primary_key= True, autoincrement= True)
    client_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    service_id: Mapped[int] = mapped_column(ForeignKey('servicos.id'))
    agendado_em: Mapped[datetime] = mapped_column(default=datetime.now)
    status: Mapped[str] = mapped_column(Enum(Status), nullable=False)
    data_hora_inicio: Mapped[datetime] = mapped_column(nullable=False)
    data_hora_fim: Mapped[datetime] = mapped_column(nullable=False)
    
    agendamento_usuario: Mapped['User'] = relationship(back_populates='agendamento')
    agendamento_servico: Mapped['Service'] = relationship(back_populates= 'servicos_agendados')

    @property
    def name_user(self):
        return self.agendamento_usuario.name
    @property
    def name_service(self):
        return self.agendamento_servico.name
    @property
    def name_provider(self):
        return self.agendamento_servico.service_provider.user.name
