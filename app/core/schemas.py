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