from pydantic import BaseModel, Field, EmailStr


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    # use `fullname` to match the field name used in the FastAPI endpoint
    fullname: str = Field(..., min_length=2, max_length=50)
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6)