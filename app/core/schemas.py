from pydantic import BaseModel, EmailStr,Field, ConfigDict
from typing import Optional
class UserInput(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6, max_length= 72)

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

class ServiceOutput(BaseModel):
    id: int
    provider_id: int
    name: str
    duration_minutes: int
    price: float