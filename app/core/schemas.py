import re
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime


class UserInput(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    email: EmailStr = Field(max_length=100)
    password: str = Field(min_length=6, max_length=72)
    model_config = ConfigDict(str_strip_whitespace=True)
    @field_validator('name', mode='before')
    @classmethod
    def limitar_espacos_excessivos(cls, v: str) -> str:
        if isinstance(v, str):
            return re.sub(r'\s{2,}', ' ', v)
        return v

class UserLogin(BaseModel):
    email: EmailStr = Field(max_length=100)
    password: str = Field(min_length=6, max_length=72)

class RefreshTokenInput(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=500)

class UserOutput(BaseModel):
    id: int = Field(gt=0)
    name: str = Field(min_length=3, max_length=100)
    email: str = Field(max_length=100)
    role: str = Field(max_length=20)
    profile_picture: Optional[str] = Field(None, max_length=300)
    model_config = ConfigDict(from_attributes=True)


class ProviderInput(BaseModel):
    user_id: int = Field(gt=0, le=2147483647)
    bio: str = Field(min_length=1, max_length=500)
    specialty: str = Field(min_length=1, max_length=100)


class ProvidersPatch(BaseModel):
    bio: Optional[str] = Field(None, min_length=1, max_length=500)
    specialty: Optional[str] = Field(None, min_length=1, max_length=100)


class ProviderOutput(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    id: int = Field(gt=0)
    bio: str = Field(max_length=500)
    specialty: str = Field(max_length=100)
    operando: str = Field(max_length=20)
    model_config = ConfigDict(from_attributes=True)


class ServiceInput(BaseModel):
    provider_id: int = Field(gt=0, le=2147483647)
    name: str = Field(min_length=1, max_length=100)
    duration_minutes: int = Field(gt=0, le=1440)
    price: float = Field(ge=0, le=1000000)
    category: str = Field(min_length=1, max_length=50)

    @field_validator('category')
    @classmethod
    def category_to_upper(cls, v: str) -> str:
        return v.upper() if v else v


class ServicePatch(BaseModel):

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    duration_minutes: Optional[int] = Field(None, gt=0, le=1440)
    price: Optional[float] = Field(None, ge=0, le=1000000)
    category: Optional[str] = Field(None, min_length=1, max_length=50)

    @field_validator('category')
    @classmethod
    def category_to_upper(cls, v: Optional[str]) -> Optional[str]:
        return v.upper() if v else v


class ServiceOutput(BaseModel):

    id: int = Field(gt=0)
    provider_name: str = Field(alias="nome", max_length=100)
    provider_id: int = Field(gt=0)
    name: str = Field(max_length=100)
    duration_minutes: int = Field(gt=0)
    price: float = Field(ge=0)
    category: str = Field(max_length=50)
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class AgendamentoInput(BaseModel):
    client_id: int = Field(gt=0, le=2147483647)
    data_hora_inicio: datetime


class AgendamentosOutput(BaseModel):
    id: int = Field(gt=0)
    name_user: str = Field(max_length=100)
    name_provider: str = Field(max_length=100)
    name_service: str = Field(max_length=100)
    data_hora_inicio: datetime
    data_hora_fim: datetime
    status: str = Field(max_length=20)
    model_config = ConfigDict(from_attributes=True)


class ForgotPasswordInput(BaseModel):
    email: EmailStr


class ResetPasswordInput(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=6, max_length=72)

class FinanceInput(BaseModel):
    description: str = Field(min_length=1, max_length=200)
    type: str = Field(min_length=1, max_length=20)
    amount: float = Field(ge=0, le=10000000)

    @field_validator('type')
    @classmethod
    def type_to_upper(cls, v: str) -> str:
        return v.upper() if v else v

class FinanceOutput(BaseModel):
    id: int = Field(gt=0)
    description: str = Field(max_length=200)
    type: str = Field(max_length=20)
    amount: float = Field(ge=0)
    date: datetime
    model_config = ConfigDict(from_attributes=True)