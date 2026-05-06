from app.db.models import User, Provider, Service, StatusProvider, Status, Appointments, UserRefreshToken, Finance, FinanceType
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional
from datetime import timedelta, datetime,timezone




# ==============================================================================
# USER REPOSITORY
# ==============================================================================


def register_user(
    db: Session,
    name: str,
    email: str,
    hashed_password: str,
    role: str = "CLIENT",
) -> User:
    """Cria um novo usuário no banco de dados."""
    new_user = User(
        name=name,
        email=email,
        hashed_password=hashed_password,
        role=role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Busca um usuário pelo ID."""
    return db.get(User, user_id)

def get_user_by_name(db: Session, name: str) -> list[User]:
    """Busca usuários pelo nome (case-insensitive)."""
    query = select(User).where(User.name.ilike(f"%{name}%"))
    return list(db.scalars(query).all())

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    query = select(User).where(User.email == email)
    return db.scalars(query).first()


def save_reset_code(db: Session, email: str, code: str, expire: datetime) -> bool:
    user = get_user_by_email(db, email)
    if not user:
        return False
    user.reset_password_code = code
    user.reset_password_expire = expire
    db.commit()
    return True


def reset_user_password(db: Session, email: str, code: str, hashed_password: str) -> bool:
    query = select(User).where(
        User.email == email,
        User.reset_password_code == code,
        User.reset_password_expire > datetime.now(timezone.utc)
    )
    user = db.scalars(query).first()
    if not user:
        return False
    
    user.hashed_password = hashed_password
    user.reset_password_code = None
    user.reset_password_expire = None
    db.commit()
    return True
# ==============================================================================
# PROVIDER REPOSITORY
# ==============================================================================


def register_provider(
    db: Session,
    user_id: int,
    bio: str,
    specialty: str,
    provider_role: str = "PROVIDER",
) -> Optional[Provider]:
    """Registra um provider a partir de um usuário existente.

    Atualiza o role do usuário para PROVIDER e cria o registro Provider.
    Retorna None se o usuário não existir.
    """
    user = db.get(User, user_id)
    if user is None:
        return None

    user.role = provider_role
    db.commit()

    new_provider = Provider(user_id=user_id, bio=bio, specialty=specialty)
    db.add(new_provider)
    db.commit()
    db.refresh(new_provider)
    return new_provider


def get_all_providers(
    db: Session,
    specialty_filter: Optional[str] = None,
) -> Optional[list[Provider]]:
    """Busca todos os providers ativos, opcionalmente filtrando por especialidade."""
    query = select(Provider).where(Provider.operando == StatusProvider.ATIVO)

    if specialty_filter is not None:
        query = query.filter(Provider.specialty.ilike(f"%{specialty_filter}%"))

    providers = db.scalars(query).all()
    return providers if providers else None


def get_provider_by_id(db: Session, provider_id: int) -> Optional[Provider]:
    """Busca um provider ativo pelo ID."""
    query = select(Provider).where(
        Provider.operando == StatusProvider.ATIVO,
        Provider.id == provider_id,
    )
    return db.scalars(query).first()


def reactivate_provider(db: Session, provider_id: int) -> Optional[Provider]:
    """Reativa um provider inativo."""
    query = select(Provider).where(
        Provider.operando == StatusProvider.INATIVO,
        Provider.id == provider_id,
    )
    provider = db.scalars(query).first()
    if provider is None:
        return None

    provider.operando = StatusProvider.ATIVO
    db.commit()
    return provider


def deactivate_provider(db: Session, provider_id: int) -> Optional[str]:
    """Soft-delete: marca o provider como INATIVO."""
    provider = get_provider_by_id(db, provider_id)
    if provider is None:
        return None

    provider.operando = StatusProvider.INATIVO
    db.commit()
    return "Provider inativado com sucesso"


def update_provider(
    db: Session,
    provider_id: int,
    bio: Optional[str] = None,
    specialty: Optional[str] = None,
) -> Optional[Provider]:
    """Atualiza bio e/ou especialidade de um provider ativo."""
    provider = get_provider_by_id(db, provider_id)
    if provider is None:
        return None

    if bio is not None:
        provider.bio = bio
    if specialty is not None:
        provider.specialty = specialty

    db.commit()
    return provider


# ==============================================================================
# SERVICE REPOSITORY
# ==============================================================================


def create_service(
    db: Session,
    provider_id: int,
    name: str,
    duration_minutes: int,
    price: float,
    category: str,
) -> Optional[Service]:
    """Cria um serviço vinculado a um provider ativo. Retorna None se o provider não existir."""
    provider = get_provider_by_id(db, provider_id)
    if provider is None:
        return None

    service = Service(
        provider_id=provider_id,
        name=name,
        duration_minutes=duration_minutes,
        price=price,
        category=category,
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


def get_services_by_provider(db: Session, provider_id: int) -> Optional[list[Service]]:
    """Busca todos os serviços de um provider ativo."""
    query = (
        select(Service)
        .join(Provider)
        .where(
            Service.provider_id == provider_id,
            Provider.operando == StatusProvider.ATIVO,
        )
    )
    services = db.scalars(query).all()
    return services if services else None


def get_service_by_id(
    db: Session,
    provider_id: int,
    service_id: int,
) -> Optional[Service]:
    """Busca um serviço específico de um provider."""
    query = select(Service).where(
        Service.provider_id == provider_id,
        Service.id == service_id,
    )
    return db.scalars(query).first()


def update_service(
    db: Session,
    provider_id: int,
    service_id: int,
    name: Optional[str] = None,
    duration_minutes: Optional[int] = None,
    price: Optional[float] = None,
    category: Optional[str] = None,
) -> Optional[Service]:
    """Atualiza campos de um serviço. Retorna None se provider ou serviço não forem encontrados."""
    provider = get_provider_by_id(db, provider_id)
    if provider is None:
        return None

    service = get_service_by_id(db, provider_id, service_id)
    if service is None:
        return None

    if name is not None:
        service.name = name
    if duration_minutes is not None:
        service.duration_minutes = duration_minutes
    if price is not None:
        service.price = price
    if category is not None:
        service.category = category

    db.commit()
    return service


# ==============================================================================
# APPOINTMENT REPOSITORY
# ==============================================================================


class AppointmentClosedError(ValueError):
    """Lançado quando o horário está fora do expediente."""
    pass


class AppointmentConflictError(ValueError):
    """Lançado quando já existe agendamento no horário solicitado."""
    pass

class NoAppointmentNeeded(ValueError):
    """Lançado quando não existe agendamento salvo"""


def create_appointment(
    db: Session,
    service_id: int,
    provider_id: int,
    start_time: datetime,
    client_id: int,
    status: str = "PENDENTE",
) -> Optional[Appointments]:
    """Cria um agendamento verificando horário de funcionamento e conflitos.
    """
    service = get_service_by_id(db, provider_id, service_id)
    if service is None:
        return None

    end_time = start_time + timedelta(minutes=service.duration_minutes)

    if start_time.hour < 9 or end_time.hour > 18 or (end_time.hour == 18 and end_time.minute > 0):
        raise AppointmentClosedError("Estabelecimento fechado neste horário")

    conflict_query = (
        select(Appointments)
        .join(Service)
        .filter(
            Service.provider_id == provider_id,
            Appointments.data_hora_inicio < end_time,
            Appointments.data_hora_fim > start_time,
            Appointments.status == Status.PENDENTE
        )
    )
    conflict = db.scalars(conflict_query).first()
    if conflict:
        raise AppointmentConflictError("Horário já possui agendamento marcado")

    new_appointment = Appointments(
        client_id=client_id,
        service_id=service_id,
        status=status,
        data_hora_inicio=start_time,
        data_hora_fim=end_time,
    )
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    return new_appointment

def get_appointment_by_id(
    db: Session,
    appointment_id: int,
    client_id: int
) -> Optional[Appointments]:
    query = select(Appointments).where(Appointments.id == appointment_id, Appointments.client_id == client_id)
    result = db.scalars(query).first()
    if result is None:
        raise NoAppointmentNeeded("Não existe agendamento com esse ID")
    return result

def get_appointment_status(
    db: Session,
    appointment_id: int,
) -> Optional[Appointments]:
    """Busca um agendamento pelo ID sem filtrar por status."""
    return db.get(Appointments, appointment_id)

def get_appointments_by_provider(
    db: Session,
    provider_id:int
    ) -> Optional[Appointments]:
    query = select(Appointments).join(Service).filter(Service.provider_id == provider_id)
    result = db.scalars(query).all()
    if not result:
        raise NoAppointmentNeeded("Não existe agendamento para esse provider")
    return result

def get_busy_times_by_provider(
    db: Session,
    provider_id: int,
    target_date: datetime.date
):
    from sqlalchemy import cast, Date
    query = (
        select(Appointments.data_hora_inicio, Appointments.data_hora_fim)
        .join(Service)
        .filter(
            Service.provider_id == provider_id,
            Appointments.status != Status.CANCELADO,
            cast(Appointments.data_hora_inicio, Date) == target_date
        )
    )
    result = db.execute(query).all()
    return result

def get_appointments_by_client(
    db: Session,
    client_id: int
) -> Optional[list[Appointments]]:
    query = select(Appointments).where(Appointments.client_id == client_id).order_by(Appointments.data_hora_inicio.desc())
    result = db.scalars(query).all()
    if not result:
        return [] 
    return result

def patch_appointment(
    db: Session,
    appointment_id: int,
    client_id: int
) -> Optional[Appointments]:
    search_by_id = get_appointment_by_id(db, appointment_id,client_id)
    if search_by_id is None:
        raise NoAppointmentNeeded("Não existe agendamento com esse ID")
    search_by_id.status = Status.CANCELADO
    db.commit()
    return search_by_id

def confirmar_agendamento(
    db:Session,
    appointment_id: int,
    client_id: int
) -> Optional[Appointments]:
    search_by_id = get_appointment_by_id(db, appointment_id,client_id)
    search_by_id.status = Status.CONFIRMADO
    db.commit()
    return search_by_id

def cancel_appointment(
    db: Session,
    appointment_id: int,
    client_id: int) -> Optional[Appointments]:
    search_by_id = get_appointment_by_id(db, appointment_id,client_id)
    if search_by_id is None:
        raise NoAppointmentNeeded("Não existe agendamento com esse ID")
    if search_by_id.status == Status.PENDENTE:
        search_by_id.status = Status.CANCELADO
        db.commit()
        db.refresh(search_by_id)
        return search_by_id.status
    return None

# ==============================================================================
# SECURITY REPOSITORY
# ==============================================================================

def get_valid_token(
    db: Session,
    token_str:str) -> Optional[UserRefreshToken]:
    query = select(UserRefreshToken).where(UserRefreshToken.token == token_str, UserRefreshToken.revoked == False, UserRefreshToken.expire_at > datetime.now(timezone.utc))
    search_token = db.scalars(query).first()
    return search_token

def add_token_in_db(
    db:Session,
    token: str,
    expire: datetime,
    id_user: int
) -> Optional[UserRefreshToken]:

    verify_user_id = get_user_by_id(db, id_user)
    if verify_user_id is None:
        return None
    new_token = UserRefreshToken(
        token=token,
        expire_at=expire,
        user_id= id_user
    )
    db.add(new_token)
    db.commit()
    db.refresh(new_token)
    return new_token

# ==============================================================================
# FINANCE REPOSITORY
# ==============================================================================


def create_finance(
    db: Session,
    description: str,
    finance_type: "FinanceType",
    amount: float,
) -> "Finance":
    """Cria uma nova transação financeira."""
    nova_financa = Finance(
        description=description,
        type=finance_type,
        amount=amount,
    )
    db.add(nova_financa)
    db.commit()
    db.refresh(nova_financa)
    return nova_financa


def get_all_finances(db: Session) -> list["Finance"]:
    """Busca todas as transações financeiras ordenadas por data."""
    return list(db.scalars(select(Finance).order_by(Finance.date.desc())).all())