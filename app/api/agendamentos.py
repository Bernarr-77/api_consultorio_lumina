from fastapi import APIRouter, HTTPException, Depends, Path
from sqlalchemy.orm import Session
from app.core.schemas import AgendamentoInput, AgendamentosOutput
from app.db.session import get_db
from app.workers.task import confirmacao_email, enviar_email_lembrete, enviar_email_lembrete_2h, enviar_email_de_cancelamento
from zoneinfo import ZoneInfo
from datetime import timedelta,datetime
from app.api.auth import get_current_user, require_provider
from app.db.repositorio import (
    create_appointment,
    AppointmentClosedError,
    AppointmentConflictError,
    NoAppointmentNeeded,
    get_appointment_by_id,
    get_appointments_by_provider,
    get_busy_times_by_provider,
    get_appointments_by_client,
    patch_appointment,
    get_user_by_id,
    confirmar_agendamento
)

from datetime import date

router_agendamentos = APIRouter(prefix="/appointments", 
                                tags=["Appointments"],
                                dependencies=[Depends(get_current_user)])

@router_agendamentos.post("/{service_id}/{provider_id}", response_model=AgendamentosOutput)
def create_appointment_route(
    payload: AgendamentoInput,
    service_id: int = Path(..., gt=0, le=2147483647),
    provider_id: int = Path(..., gt=0, le=2147483647),
    db: Session = Depends(get_db),
):
    """Cria um novo agendamento verificando horário e conflitos.
    """
    try:
        appointment = create_appointment(
            db, service_id, provider_id, payload.data_hora_inicio, payload.client_id)
        verificator_user = get_user_by_id(db, payload.client_id)
        if verificator_user is None:
            raise HTTPException(status_code=404, detail="Usuario não encontrado")
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

    if appointment.data_hora_inicio.tzinfo is None:
        inicio_sp = appointment.data_hora_inicio.replace(tzinfo=ZoneInfo("America/Sao_Paulo"))
        fim_sp = appointment.data_hora_fim.replace(tzinfo=ZoneInfo("America/Sao_Paulo"))
    else:
        inicio_sp = appointment.data_hora_inicio.astimezone(ZoneInfo("America/Sao_Paulo"))
        fim_sp = appointment.data_hora_fim.astimezone(ZoneInfo("America/Sao_Paulo"))

    inicio_formatado = inicio_sp.strftime("%d/%m/%Y às %H:%M")
    fim_formatado = fim_sp.strftime("%d/%m/%Y às %H:%M")

    aviso_um_dia_antes = inicio_sp - timedelta(days=1)
    aviso_duas_hora_antes = inicio_sp - timedelta(hours=2)

    if aviso_um_dia_antes > datetime.now(tz=ZoneInfo("America/Sao_Paulo")):
        enviar_email_lembrete.apply_async(args=[verificator_user.email, inicio_formatado, fim_formatado, appointment.id, payload.client_id], eta=aviso_um_dia_antes)
        momento_expiracao = inicio_sp - timedelta(hours=16)
        enviar_email_de_cancelamento.apply_async(args=[appointment.id, payload.client_id], eta=momento_expiracao)

    if aviso_duas_hora_antes > datetime.now(tz=ZoneInfo("America/Sao_Paulo")):
        enviar_email_lembrete_2h.apply_async(args=[verificator_user.email, inicio_formatado, fim_formatado, appointment.id], eta=aviso_duas_hora_antes)
    confirmacao_email.delay(verificator_user.email, inicio_formatado, fim_formatado)
    return appointment

@router_agendamentos.get("/me", response_model=list[AgendamentosOutput])
def get_my_appointments(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Busca o histórico de agendamentos do cliente logado."""
    try:
        result = get_appointments_by_client(db, current_user.id)
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")

@router_agendamentos.get("/busy-times/{provider_id}", response_model=list[str])
def get_busy_times(provider_id: int = Path(..., gt=0, le=2147483647), data: date = None, db: Session = Depends(get_db)):
    """Busca horários ocupados de um provider em uma data específica."""
    if not data:
        data = date.today()
    try:
        times = get_busy_times_by_provider(db, provider_id, data)
        busy_slots = set()
        for inicio, fim in times:
            if inicio.tzinfo is None:
                current = inicio.replace(tzinfo=ZoneInfo("America/Sao_Paulo"))
                end_time = fim.replace(tzinfo=ZoneInfo("America/Sao_Paulo"))
            else:
                current = inicio.astimezone(ZoneInfo("America/Sao_Paulo"))
                end_time = fim.astimezone(ZoneInfo("America/Sao_Paulo"))
                
            while current < end_time:
                busy_slots.add(current.strftime("%H:%M"))
                current += timedelta(minutes=30)
        return sorted(list(busy_slots))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

@router_agendamentos.get("/{appointment_id}/{client_id}", response_model=AgendamentosOutput)
def get_appointment_route(appointment_id: int = Path(..., gt=0, le=2147483647), client_id: int = Path(..., gt=0, le=2147483647), db: Session = Depends(get_db)):
    """Busca agendamentos pelo Id"""
    try:
        result_get = get_appointment_by_id(db, appointment_id, client_id)
    except NoAppointmentNeeded:
        raise HTTPException(status_code=404, detail= "Não existe registro desse agendamento")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return result_get

@router_agendamentos.get("/{provider_id}",response_model=list[AgendamentosOutput])
def get_appointments_all(provider_id: int = Path(..., gt=0, le=2147483647), db: Session = Depends(get_db), provedor = Depends(require_provider)):
    """Busca agendamentos pelo provider"""
    try:
        result_get = get_appointments_by_provider(db,provider_id)
    except NoAppointmentNeeded:
        raise HTTPException(status_code=404, detail= "Não existe registro desse agendamento")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return result_get

@router_agendamentos.delete("/{appointment_id}/{client_id}",response_model=AgendamentosOutput)
def cancel_appointment(appointment_id: int = Path(..., gt=0, le=2147483647), client_id: int = Path(..., gt=0, le=2147483647), db: Session = Depends(get_db)):
    """Cancela o agendamento alterando o status"""
    try:
        soft_delete = patch_appointment(db,appointment_id, client_id)
    except NoAppointmentNeeded:
        raise HTTPException(status_code=404, detail= "Não existe registro desse agendamento")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return soft_delete

@router_agendamentos.get("/confirmar/{appointment_id}/{client_id}", response_model=AgendamentosOutput)
def confirmar_agendamento_route(appointment_id: int = Path(..., gt=0, le=2147483647), client_id: int = Path(..., gt=0, le=2147483647), db: Session = Depends(get_db)):    
    """Confirma o agendamento pelo botão do e-mail"""
    try:
        confirmacao = confirmar_agendamento(db, appointment_id, client_id)
    except NoAppointmentNeeded:
        raise HTTPException(status_code=404, detail="Não existe registro desse agendamento")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Erro desconhecido: {str(exc)}")
    return confirmacao