from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import FinanceType
from app.db.repositorio import create_finance, get_all_finances
from app.core.schemas import FinanceInput, FinanceOutput
from typing import List

router_finance = APIRouter(prefix="/finance", tags=["Finance"])

@router_finance.post("/", response_model=FinanceOutput, status_code=status.HTTP_201_CREATED)
def post_finance(finance: FinanceInput, db: Session = Depends(get_db)):
    try:
        finance_type = FinanceType(finance.type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid finance type. Must be INCOME or EXPENSE")
    
    nova_financa = create_finance(db, finance.description, finance_type, finance.amount)
    return nova_financa

@router_finance.get("/", response_model=List[FinanceOutput])
def list_finances(db: Session = Depends(get_db)):
    return get_all_finances(db)
