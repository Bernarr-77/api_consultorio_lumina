from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime


class UserInput(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class UserOutput(BaseModel):
    id: int
    name: str
    email: str
    role: str
    model_config = ConfigDict(from_attributes=True)


class ProviderInput(BaseModel):
    user_id: int
    bio: str
    specialty: str


class ProvidersPatch(BaseModel):
    bio: Optional[str] = None
    specialty: Optional[str] = None


class ProviderOutput(BaseModel):
    name: str
    id: int
    bio: str
    specialty: str
    operando: str
    model_config = ConfigDict(from_attributes=True)


class ServiceInput(BaseModel):
    provider_id: int
    name: str
    duration_minutes: int
    price: float


class ServicePatch(BaseModel):

    name: Optional[str] = None
    duration_minutes: Optional[int] = None
    price: Optional[float] = None


class ServiceOutput(BaseModel):

    id: int
    provider_name: str = Field(alias="nome")
    provider_id: int
    name: str
    duration_minutes: int
    price: float
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AgendamentoInput(BaseModel):
    client_id: int
    data_hora_inicio: datetime


class AgendamentosOutput(BaseModel):
    id: int
    name_user: str
    name_provider:str
    name_service: str
    data_hora_inicio: datetime
    data_hora_fim: datetime
    status: str
    model_config = ConfigDict(from_attributes=True)