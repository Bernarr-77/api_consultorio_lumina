from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

class Base(DeclarativeBase):
    pass

engine = create_engine(os.getenv("DATABASE_URL"))
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

def get_db():
    with SessionLocal() as db:
        yield db

