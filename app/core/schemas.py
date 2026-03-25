from pydantic import BaseModel, EmailStr,Field, ConfigDict

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

class ProviderOutput(BaseModel):
    id: int
    bio: str
    specialty: str
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