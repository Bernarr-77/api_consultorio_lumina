import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Calendar from '../components/Calendar';
import './BookingPage.css';

export default function BookingPage() {
  const { serviceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get providerId and service from state if available
  const stateProviderId = location.state?.providerId;
  const stateService = location.state?.service;

  const [service, setService] = useState(stateService || null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [step, setStep] = useState(1); // 1 = data/hora, 2 = revisão
  const [loading, setLoading] = useState(!stateService);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [busyTimes, setBusyTimes] = useState([]);

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  ];

  useEffect(() => {
    if (!service) {
      loadService();
    }
  }, [serviceId, stateProviderId]);

  const loadService = async () => {
    if (!stateProviderId) {
      setLoading(false);
      return;
    }
    
    try {
      const res = await api.get(`/services/${stateProviderId}`);
      const found = res.data.find((s) => s.id === parseInt(serviceId));
      setService(found || null);
    } catch (err) {
      console.error('Erro ao carregar serviço:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate && stateProviderId) {
      loadBusyTimes(selectedDate);
    } else {
      setBusyTimes([]);
    }
  }, [selectedDate, stateProviderId]);

  const loadBusyTimes = async (date) => {
    try {
      const res = await api.get(`/appointments/busy-times/${stateProviderId}?data=${date}`);
      setBusyTimes(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar horários ocupados:', err);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    const sp = new Date(today.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const year = sp.getFullYear();
    const month = String(sp.getMonth() + 1).padStart(2, '0');
    const day = String(sp.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMaxDate = () => {
    const max = new Date();
    max.setDate(max.getDate() + 10);
    return max.toISOString().split('T')[0];
  };

  const handleConfirm = async () => {
    if (!selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError('');

    try {
      const dateTime = `${selectedDate}T${selectedTime}:00`;

      await api.post(`/appointments/${serviceId}/${stateProviderId}`, {
        client_id: user.id,
        data_hora_inicio: dateTime,
      });

      navigate('/confirmation', {
        state: {
          service: service,
          date: selectedDate,
          time: selectedTime,
        },
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail) {
        setError(detail);
      } else {
        setError('Erro ao criar agendamento. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner text="Carregando..." />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="page">
        <div className="container">
          <div className="booking-error">
            <h2>Serviço não encontrado</h2>
            <button className="btn btn-primary" onClick={() => navigate('/services')}>
              Voltar aos serviços
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page" id="booking-page" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background Decorations */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        right: '-10%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(170, 240, 209, 0.08) 0%, transparent 70%)',
        filter: 'blur(60px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        left: '-5%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(72, 127, 136, 0.06) 0%, transparent 70%)',
        filter: 'blur(50px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        {/* Back button */}
        <button className="booking-back" onClick={() => step === 2 ? setStep(1) : navigate(-1)} id="booking-back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar
        </button>

        {/* Progress */}
        <div className="booking-progress animate-fade-in">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <span className="progress-dot" />
            <span className="progress-label">Data & Hora</span>
          </div>
          <div className="progress-line" />
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <span className="progress-dot" />
            <span className="progress-label">Confirmação</span>
          </div>
        </div>

        {step === 1 && (
          <div className="booking-step animate-fade-in" id="booking-step-1">
            <h2>Escolha a data e horário</h2>
            <p className="booking-service-label">
              {service.name} — {service.provider_name}
            </p>

            {/* Date Picker (Custom Calendar) */}
            <div className="input-group">
              <label htmlFor="booking-date">Data</label>
              <Calendar 
                selectedDate={selectedDate} 
                onDateSelect={(date) => setSelectedDate(date)} 
                minDate={getMinDate()}
                maxDate={getMaxDate()} 
              />
            </div>

            {/* Time Slots */}
            {selectedDate && (
              <div className="timeslots-section animate-fade-in">
                <label>Horários disponíveis</label>
                <div className="timeslots-grid" id="timeslots-grid">
                  {(() => {
                    const availableSlots = timeSlots.filter(t => {
                      if (busyTimes.includes(t)) return false;
                      if (selectedDate === getMinDate()) {
                        const now = new Date();
                        const spNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
                        const currentTimeStr = `${String(spNow.getHours()).padStart(2, '0')}:${String(spNow.getMinutes()).padStart(2, '0')}`;
                        if (t < currentTimeStr) return false;
                      }
                      return true;
                    });
                    
                    return availableSlots.length > 0 ? (
                      availableSlots.map((time) => (
                        <button
                          key={time}
                          className={`timeslot ${selectedTime === time ? 'active' : ''}`}
                          onClick={() => setSelectedTime(time)}
                          id={`slot-${time.replace(':', '')}`}
                        >
                          {time}
                        </button>
                      ))
                    ) : (
                      <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Nenhum horário disponível para esta data.
                      </p>
                    );
                  })()}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-full btn-lg"
              disabled={!selectedDate || !selectedTime}
              onClick={() => setStep(2)}
              id="go-to-review"
            >
              Revisar agendamento
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="booking-step animate-fade-in" id="booking-step-2">
            <h2>Revisão do agendamento</h2>

            <div className="review-card card">
              <div className="review-item">
                <span className="review-label">Serviço</span>
                <span className="review-value">{service.name}</span>
              </div>
              <div className="review-divider" />
              <div className="review-item">
                <span className="review-label">Profissional</span>
                <span className="review-value">{service.provider_name}</span>
              </div>
              <div className="review-divider" />
              <div className="review-item">
                <span className="review-label">Data</span>
                <span className="review-value">{formatDate(selectedDate)}</span>
              </div>
              <div className="review-divider" />
              <div className="review-item">
                <span className="review-label">Horário</span>
                <span className="review-value">{selectedTime}</span>
              </div>
              <div className="review-divider" />
              <div className="review-item">
                <span className="review-label">Duração</span>
                <span className="review-value">{service.duration_minutes} minutos</span>
              </div>
              <div className="review-divider" />
              <div className="review-item review-item-highlight">
                <span className="review-label">Valor</span>
                <span className="review-value review-price">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
                </span>
              </div>
            </div>

            <div className="confirmation-warning animate-fade-in delay-1">
              <div className="warning-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="warning-text">
                <strong>Atenção:</strong> Por favor, apenas confirme o agendamento se você tiver certeza de que poderá comparecer. O profissional reserva este tempo exclusivamente para você.
              </div>
            </div>

            {error && (
              <div className="login-error animate-fade-in" id="booking-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            <button
              className="btn btn-primary btn-full btn-lg"
              onClick={handleConfirm}
              disabled={submitting}
              id="confirm-booking"
            >
              {submitting ? <LoadingSpinner size={24} /> : 'Confirmar agendamento'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
