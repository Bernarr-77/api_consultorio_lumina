import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './CalendarPage.css';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getStatusBadge(status) {
  const s = status?.toUpperCase();
  if (s === 'CONFIRMADO') return <span className="badge badge-confirmed">✓ Confirmado</span>;
  if (s === 'CANCELADO') return <span className="badge badge-cancelled">✕ Cancelado</span>;
  return <span className="badge badge-pending">● Pendente</span>;
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function isSameDay(dateStr, selectedDate) {
  const d = new Date(dateStr);
  const sp = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  return (
    sp.getFullYear() === selectedDate.getFullYear() &&
    sp.getMonth() === selectedDate.getMonth() &&
    sp.getDate() === selectedDate.getDate()
  );
}

function isPast(year, month, day) {
  if (!day) return false;
  const d = new Date(year, month, day);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d < now;
}

function getDurationMinutes(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e - s) / 60000);
}

export default function CalendarPage() {
  const { user } = useAuth();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(today);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [actioningId, setActioningId] = useState(null);
  const [toast, setToast] = useState(null);
  const [modal, setModal] = useState({ isOpen: false, type: '', appt: null, user: null });

  const [providerId, setProviderId] = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/providers/');
      const allProviders = res.data;
      const myProvider = allProviders.find(p => p.name === user?.name);
      if (myProvider) setProviderId(myProvider.id);

      const results = await Promise.allSettled(
        allProviders.map(p => api.get(`/appointments/${p.id}`))
      );
      const allAppointments = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value.data);
      const seen = new Set();
      const unique = allAppointments.filter(a => {
        if (seen.has(a.id)) return false;
        seen.add(a.id);
        return true;
      });
      setAppointments(unique);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  async function handleCancelClick(appt) {
    try {
      const userRes = await api.get(`/users/name?name=${encodeURIComponent(appt.name_user)}`);
      const foundUser = userRes.data?.[0];
      if (!foundUser) { showToast('Usuário não encontrado', 'error'); return; }
      setModal({ isOpen: true, type: 'cancel', appt, user: foundUser });
    } catch {
      showToast('Erro ao buscar usuário', 'error');
    }
  }

  async function handleConfirmClick(appt) {
    try {
      const userRes = await api.get(`/users/name?name=${encodeURIComponent(appt.name_user)}`);
      const foundUser = userRes.data?.[0];
      if (!foundUser) { showToast('Usuário não encontrado', 'error'); return; }
      setModal({ isOpen: true, type: 'confirm', appt, user: foundUser });
    } catch {
      showToast('Erro ao buscar usuário', 'error');
    }
  }

  async function executeAction() {
    if (!modal.appt || !modal.user) return;
    setActioningId(modal.appt.id);
    try {
      if (modal.type === 'cancel') {
        await api.delete(`/appointments/${modal.appt.id}/${modal.user.id}`);
        showToast('Agendamento cancelado com sucesso!');
      } else if (modal.type === 'confirm') {
        await api.get(`/appointments/confirmar/${modal.appt.id}/${modal.user.id}`);
        showToast('Agendamento confirmado!');
      }
      fetchAppointments();
      setExpandedId(null);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erro ao processar', 'error');
    } finally {
      setActioningId(null);
      setModal({ isOpen: false, type: '', appt: null, user: null });
    }
  }

  const filteredAppointments = appointments
    .filter(a => isSameDay(a.data_hora_inicio, selectedDate))
    .sort((a, b) => new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio));

  // Calendar grid
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  function prevMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  }
  function nextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  }

  function selectDay(day) {
    if (!day) return;
    setSelectedDate(new Date(currentYear, currentMonth, day));
    setExpandedId(null);
  }

  function isToday(day) {
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  }

  function isSelected(day) {
    return day === selectedDate.getDate() && currentMonth === selectedDate.getMonth() && currentYear === selectedDate.getFullYear();
  }

  function hasAppointments(day) {
    if (!day) return false;
    const d = new Date(currentYear, currentMonth, day);
    return appointments.some(a => isSameDay(a.data_hora_inicio, d));
  }

  return (
    <div className="calendar-page animate-fade-in">
      {/* Calendar Widget */}
      <div className="calendar-widget card">
        <div className="calendar-header">
          <button className="btn btn-ghost" onClick={prevMonth}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h3 className="calendar-month">{MONTHS[currentMonth]} {currentYear}</h3>
          <button className="btn btn-ghost" onClick={nextMonth}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <div className="calendar-weekdays">
          {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
        </div>

        <div className="calendar-grid">
          {days.map((day, idx) => (
            <button
              key={idx}
              className={`calendar-day ${!day ? 'empty' : ''} ${isToday(day) ? 'today' : ''} ${isSelected(day) ? 'selected' : ''} ${hasAppointments(day) ? 'has-appointments' : ''} ${isPast(currentYear, currentMonth, day) ? 'past-date' : ''}`}
              onClick={() => selectDay(day)}
              disabled={!day}
            >
              {day}
              {hasAppointments(day) && <span className="calendar-day-dot" />}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments List */}
      <div className="appointments-section">
        <div className="appointments-header">
          <h3>
            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          <span className="appointments-count">
            {filteredAppointments.length} agendamento{filteredAppointments.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner spinner-lg" /></div>
        ) : filteredAppointments.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>Nenhum agendamento para este dia</p>
          </div>
        ) : (
          <div className="appointments-list">
            {filteredAppointments.map((appt, idx) => {
              const statusClass = `status-${appt.status?.toLowerCase()}`;
              const duration = getDurationMinutes(appt.data_hora_inicio, appt.data_hora_fim);
              const isPending = appt.status?.toUpperCase() === 'PENDENTE';
              const isCancelled = appt.status?.toUpperCase() === 'CANCELADO';

              return (
                <div
                  key={appt.id}
                  className={`appointment-card card card-interactive animate-fade-in-up delay-${Math.min(idx + 1, 5)} ${expandedId === appt.id ? 'expanded' : ''} ${statusClass}`}
                  onClick={() => setExpandedId(expandedId === appt.id ? null : appt.id)}
                  style={{ animationFillMode: 'both' }}
                >
                  <div className="appointment-card-main">
                    {/* Time Block */}
                    <div className="appointment-time-block">
                      <span className="appointment-time-start">{formatTime(appt.data_hora_inicio)}</span>
                      <span className="appointment-time-end">{formatTime(appt.data_hora_fim)}</span>
                    </div>

                    {/* Avatar */}
                    {appt.profile_picture ? (
                      <img
                        src={`http://127.0.0.1:8000${appt.profile_picture}`}
                        alt={appt.name_user}
                        className="appointment-avatar-img"
                      />
                    ) : (
                      <div className="avatar" style={{ width: 40, height: 40, fontSize: '0.875rem' }}>
                        {appt.name_user?.charAt(0)?.toUpperCase()}
                      </div>
                    )}

                    {/* Info */}
                    <div className="appointment-info">
                      <span className="appointment-name">{appt.name_user}</span>
                      <span className="appointment-service-label">{appt.name_service} • {duration} min</span>
                    </div>

                    {/* Status Badge */}
                    {getStatusBadge(appt.status)}

                    {/* Expand icon */}
                    <span className="appointment-expand-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                    </span>
                  </div>

                  {expandedId === appt.id && (
                    <div className="appointment-details animate-fade-in">
                      <div className="appointment-details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Cliente</span>
                          <span className="detail-value">{appt.name_user}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Provider</span>
                          <span className="detail-value">{appt.name_provider}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Serviço</span>
                          <span className="detail-value">{appt.name_service}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Duração</span>
                          <span className="detail-value">{duration} minutos</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Horário</span>
                          <span className="detail-value">{formatTime(appt.data_hora_inicio)} — {formatTime(appt.data_hora_fim)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Data</span>
                          <span className="detail-value">{formatDate(appt.data_hora_inicio)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      {!isCancelled && (
                        <div className="appointment-actions" style={{ display: 'flex', gap: '8px' }}>
                          {isPending && (
                            <button
                              className="btn-confirm-sm"
                              disabled={actioningId === appt.id}
                              onClick={(e) => { e.stopPropagation(); handleConfirmClick(appt); }}
                            >
                              {actioningId === appt.id && modal.type === 'confirm' ? (
                                <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                              ) : (
                                <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                  Confirmar
                                </>
                              )}
                            </button>
                          )}
                          <button
                            className="btn-cancel-sm"
                            disabled={actioningId === appt.id}
                            onClick={(e) => { e.stopPropagation(); handleCancelClick(appt); }}
                          >
                            {actioningId === appt.id && modal.type === 'cancel' ? (
                              <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                            ) : (
                              <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                Cancelar
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Action Modal */}
      {modal.isOpen && (
        <div className="custom-modal-overlay">
          <div className="custom-modal">
            <h3>{modal.type === 'cancel' ? 'Cancelar Agendamento' : 'Confirmar Agendamento'}</h3>
            <p>
              Tem certeza que deseja {modal.type === 'cancel' ? 'cancelar' : 'confirmar'} o agendamento de{' '}
              <strong>{modal.appt?.name_user}</strong>?
            </p>
            <div className="custom-modal-actions">
              <button className="btn btn-ghost" onClick={() => setModal({ isOpen: false, type: '', appt: null, user: null })} disabled={actioningId}>
                Voltar
              </button>
              <button 
                className={`btn ${modal.type === 'cancel' ? 'btn-danger' : 'btn-primary'}`} 
                onClick={executeAction} 
                disabled={actioningId}
              >
                {actioningId ? <div className="spinner" /> : (modal.type === 'cancel' ? 'Cancelar' : 'Confirmar')}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
