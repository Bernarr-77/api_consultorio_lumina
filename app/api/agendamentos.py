from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.schemas import AgendamentoInput, AgendamentosOutput
from app.db.session import get_db
from app.db.repositorio import (
    create_appointment,
    AppointmentClosedError,
    AppointmentConflictError,
    NoAppointmentNeeded,
    get_appointment_by_id,
    get_appointments_by_provider,
    patch_appointment
)

router_agendamentos = APIRouter(prefix="/appointments", tags=["Appointments"])


@router_agendamentos.post("/{service_id}/{provider_id}", response_model=AgendamentosOutput)
def create_appointment_route(
    service_id: int,
    provider_id: int,
    payload: AgendamentoInput,
    db: Session = Depends(get_db),
):
    """Cria um novo agendamento verificando horário e conflitos.
    """
    try:
        appointment = create_appointment(
            db, service_id, provider_id, payload.data_hora_inicio, payload.client_id
        )
        if appointment is None:
            raise HTTPException(status_code=404, detail="Serviço não encontrado")
    except HTTPException:
        raise
    except AppointmentClosedError:
        raise HTTPException(status_code=400, detail="Estabelecimento fechado neste horário")
    except AppointmentConflictError:
        raise HTTPException(status_code=409, detail="Horário já possui agendamento marcado")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return appointment

@router_agendamentos.get("/{appointment_id}/{client_id}", response_model=AgendamentosOutput)
def get_appointment_route(appointment_id: int, client_id: int, db: Session = Depends(get_db)):
    """Busca agendamentos pelo Id"""
    try:
        result_get = get_appointment_by_id(db, appointment_id, client_id)
    except NoAppointmentNeeded:
        raise HTTPException(status_code=404, detail= "Não existe registro desse agendamento")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return result_get

@router_agendamentos.get("/{provider_id}",response_model=list[AgendamentosOutput])
def get_appointments_all(provider_id: int, db: Session = Depends(get_db)):
    """Busca agendamentos pelo provider"""
    try:
        result_get = get_appointments_by_provider(db,provider_id)
    except NoAppointmentNeeded:
        raise HTTPException(status_code=404, detail= "Não existe registro desse agendamento")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return result_get

@router_agendamentos.delete("/{appointment_id}/{client_id}",response_model=AgendamentosOutput)
def cancel_appointment(appointment_id: int, client_id:int, db: Session = Depends(get_db)):
    """Cancela o agendamento alterando o status"""
    try:
        soft_delete = patch_appointment(db,appointment_id, client_id)
    except NoAppointmentNeeded:
        raise HTTPException(status_code=404, detail= "Não existe registro desse agendamento")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return soft_delete