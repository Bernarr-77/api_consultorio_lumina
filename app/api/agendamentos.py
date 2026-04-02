from fastapi import APIRouter, HTTPException, Depends
from app.core.schemas import  AgendamentoInput
from app.db.repositorio import criar_agendamento
from app.db.session import get_db

router_agendamentos= APIRouter()

@router_agendamentos.post("/criar_agendamento/{service_id}/{provider_id}")
def fazer_agendamento(service_id: int, provider_id: int, payload: AgendamentoInput, db = Depends(get_db)):
    try: 
        agendamento = criar_agendamento(db,service_id,provider_id,payload.data_hora_inicio,payload.client_id)
        if agendamento == 'Estabelecimento fechado':
            return 'Estabelecimento fechado'
        if agendamento == 'Horario ja tem pessoa marcada':
            return 'Horario ja tem pessoa marcada'
    except  Exception as error_500:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(error_500)}")
    return agendamento