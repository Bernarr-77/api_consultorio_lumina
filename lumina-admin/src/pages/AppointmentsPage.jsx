import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './AppointmentsPage.css';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAYS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30',
  '15:00','15:30','16:00','16:30','17:00','17:30',
];

function formatPrice(v) {
  return parseFloat(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AppointmentsPage() {
  const [tab, setTab] = useState('create'); // 'create' | 'manage'
  const [step, setStep] = useState(1); // 1=client, 2=service, 3=datetime, 4=review
  const [toast, setToast] = useState(null);

  // Step 1 — Client search
  const [searchType, setSearchType] = useState('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  // Step 2 — Service
  const [providers, setProviders] = useState([]);
  const [servicesByProvider, setServicesByProvider] = useState({});
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);

  // Step 3 — Date/time
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [busyTimes, setBusyTimes] = useState([]);

  // Step 4 — Submit
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Manage tab
  const [allAppointments, setAllAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [actioningId, setActioningId] = useState(null); // ID for confirming or cancelling

  // Modal
  const [modal, setModal] = useState({ isOpen: false, type: '', appt: null, user: null });

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // Load providers + services once
  useEffect(() => {
    api.get('/providers/').then(async (res) => {
      setProviders(res.data);
      const map = {};
      for (const p of res.data) {
        try {
          const s = await api.get(`/services/${p.id}`);
          map[p.id] = s.data;
        } catch { map[p.id] = []; }
      }
      setServicesByProvider(map);
    }).catch(() => {});
  }, []);

  // Search clients
  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const endpoint = searchType === 'email'
        ? `/users/email?email=${encodeURIComponent(searchQuery.trim())}`
        : `/users/name?name=${encodeURIComponent(searchQuery.trim())}`;
      const res = await api.get(endpoint);
      const data = Array.isArray(res.data) ? res.data : [res.data];
      setSearchResults(data);
    } catch (err) {
      if (err.response?.status === 404) setSearchResults([]);
      else showToast('Erro na busca', 'error');
    } finally { setSearching(false); }
  }

  // Load busy times when date changes
  useEffect(() => {
    if (selectedDate && selectedProvider) {
      api.get(`/appointments/busy-times/${selectedProvider.id}?data=${selectedDate}`)
        .then(r => setBusyTimes(r.data || []))
        .catch(() => setBusyTimes([]));
    } else { setBusyTimes([]); }
  }, [selectedDate, selectedProvider]);

  // Load all appointments for manage tab
  const loadAllAppointments = useCallback(async () => {
    setLoadingAppts(true);
    try {
      const provRes = await api.get('/providers/');
      const results = await Promise.allSettled(
        provRes.data.map(p => api.get(`/appointments/${p.id}`))
      );
      const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value.data);
      const seen = new Set();
      setAllAppointments(all.filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; })
        .sort((a, b) => new Date(b.data_hora_inicio) - new Date(a.data_hora_inicio)));
    } catch { setAllAppointments([]); }
    finally { setLoadingAppts(false); }
  }, []);

  useEffect(() => { if (tab === 'manage') loadAllAppointments(); }, [tab, loadAllAppointments]);

  // Submit appointment
  async function handleSubmit() {
    if (!selectedClient || !selectedService || !selectedDate || !selectedTime) return;
    setSubmitting(true);
    try {
      const dateTime = `${selectedDate}T${selectedTime}:00`;
      await api.post(`/appointments/${selectedService.id}/${selectedProvider.id}`, {
        client_id: selectedClient.id,
        data_hora_inicio: dateTime,
      });
      setSuccess(true);
      showToast('Agendamento criado com sucesso!');
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erro ao criar agendamento', 'error');
    } finally { setSubmitting(false); }
  }

  // Cancel appointment
  async function handleCancelClick(appt) {
    try {
      const userRes = await api.get(`/users/name?name=${encodeURIComponent(appt.name_user)}`);
      const found = userRes.data?.[0];
      if (!found) { showToast('Usuário não encontrado', 'error'); return; }
      setModal({ isOpen: true, type: 'cancel', appt, user: found });
    } catch {
      showToast('Erro ao buscar usuário', 'error');
    }
  }

  // Confirm appointment
  async function handleConfirmClick(appt) {
    try {
      const userRes = await api.get(`/users/name?name=${encodeURIComponent(appt.name_user)}`);
      const found = userRes.data?.[0];
      if (!found) { showToast('Usuário não encontrado', 'error'); return; }
      setModal({ isOpen: true, type: 'confirm', appt, user: found });
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
        showToast('Agendamento cancelado!');
      } else if (modal.type === 'confirm') {
        await api.get(`/appointments/confirmar/${modal.appt.id}/${modal.user.id}`);
        showToast('Agendamento confirmado!');
      }
      loadAllAppointments();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erro ao processar', 'error');
    } finally {
      setActioningId(null);
      setModal({ isOpen: false, type: '', appt: null, user: null });
    }
  }

  function resetForm() {
    setStep(1); setSelectedClient(null); setSelectedService(null);
    setSelectedProvider(null); setSelectedDate(''); setSelectedTime('');
    setSearchQuery(''); setSearchResults([]); setSuccess(false);
  }

  // Calendar helpers
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calDays.push(i);

  function isPastDay(day) {
    if (!day) return false;
    const d = new Date(calYear, calMonth, day);
    const n = new Date(); n.setHours(0,0,0,0);
    return d < n;
  }
  function isTodayDay(day) {
    return day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
  }
  function isSelectedDay(day) {
    if (!selectedDate || !day) return false;
    const [y, m, d] = selectedDate.split('-').map(Number);
    return day === d && calMonth === m - 1 && calYear === y;
  }
  function selectDay(day) {
    if (!day || isPastDay(day)) return;
    const m = String(calMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    setSelectedDate(`${calYear}-${m}-${d}`);
    setSelectedTime('');
  }

  function getMinDateStr() {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`;
  }

  function getAvailableSlots() {
    return TIME_SLOTS.filter(t => {
      if (busyTimes.includes(t)) return false;
      if (selectedDate === getMinDateStr()) {
        const now = new Date();
        const sp = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const cur = `${String(sp.getHours()).padStart(2,'0')}:${String(sp.getMinutes()).padStart(2,'0')}`;
        if (t < cur) return false;
      }
      return true;
    });
  }

  function formatApptTime(dt) {
    return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
  }
  function formatApptDate(dt) {
    return new Date(dt).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }

  function getStatusBadge(status) {
    const s = status?.toUpperCase();
    if (s === 'CONFIRMADO') return <span className="badge badge-confirmed">✓ Confirmado</span>;
    if (s === 'CANCELADO') return <span className="badge badge-cancelled">✕ Cancelado</span>;
    return <span className="badge badge-pending">● Pendente</span>;
  }

  // ---- RENDER ----
  return (
    <div className="appointments-page animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Agendamentos</h2>
          <p className="page-description">Crie e gerencie agendamentos para os clientes</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={`tab-item ${tab === 'create' ? 'active' : ''}`} onClick={() => { setTab('create'); resetForm(); }}>
          + Novo Agendamento
        </button>
        <button className={`tab-item ${tab === 'manage' ? 'active' : ''}`} onClick={() => setTab('manage')}>
          Gerenciar
        </button>
      </div>

      {/* ===== CREATE TAB ===== */}
      {tab === 'create' && !success && (
        <>
          {/* Stepper */}
          <div className="stepper">
            {['Cliente', 'Serviço', 'Data/Hora', 'Confirmar'].map((label, i) => (
              <span key={i} style={{ display: 'contents' }}>
                <div className={`stepper-step ${step === i + 1 ? 'active' : ''} ${step > i + 1 ? 'done' : ''}`}>
                  <span className="stepper-circle">{step > i + 1 ? '✓' : i + 1}</span>
                  <span className="stepper-label">{label}</span>
                </div>
                {i < 3 && <div className={`stepper-line ${step > i + 1 ? 'done' : ''}`} />}
              </span>
            ))}
          </div>

          {/* STEP 1 — Search Client */}
          {step === 1 && (
            <div className="search-section animate-fade-in">
              <div className="search-toggle">
                <button className={`search-toggle-btn ${searchType === 'name' ? 'active' : ''}`} onClick={() => setSearchType('name')}>Por Nome</button>
                <button className={`search-toggle-btn ${searchType === 'email' ? 'active' : ''}`} onClick={() => setSearchType('email')}>Por Email</button>
              </div>
              <div className="search-bar">
                <input
                  className="input-field"
                  placeholder={searchType === 'email' ? 'Digite o email do cliente...' : 'Digite o nome do cliente...'}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
                <button className="btn btn-primary btn-sm" onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                  {searching ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Buscar'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="search-results animate-fade-in">
                  {searchResults.map(u => (
                    <div
                      key={u.id}
                      className={`search-result-item ${selectedClient?.id === u.id ? 'selected' : ''}`}
                      onClick={() => setSelectedClient(u)}
                    >
                      <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>{u.name?.charAt(0)?.toUpperCase()}</div>
                      <div className="search-result-info">
                        <span className="search-result-name">{u.name}</span>
                        <span className="search-result-email">{u.email}</span>
                      </div>
                      {selectedClient?.id === u.id && (
                        <span className="search-result-check">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {searchResults.length === 0 && searchQuery && !searching && (
                <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', textAlign: 'center' }}>Nenhum cliente encontrado</p>
              )}

              <div className="step-actions">
                <button className="btn btn-primary" disabled={!selectedClient} onClick={() => setStep(2)}>
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — Select Service */}
          {step === 2 && (
            <div className="service-selection animate-fade-in">
              {selectedClient && (
                <div className="card" style={{ padding: 'var(--space-md) var(--space-lg)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>{selectedClient.name?.charAt(0)?.toUpperCase()}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{selectedClient.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{selectedClient.email}</div>
                  </div>
                </div>
              )}

              {providers.map(p => {
                const svcs = servicesByProvider[p.id] || [];
                if (svcs.length === 0) return null;
                return (
                  <div key={p.id} className="provider-group">
                    <div className="provider-group-header">
                      <div className="avatar" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>{p.name?.charAt(0)?.toUpperCase()}</div>
                      <span className="provider-group-name">{p.name}</span>
                      <span className="provider-group-specialty">— {p.specialty}</span>
                    </div>
                    <div className="service-options">
                      {svcs.map(s => (
                        <div
                          key={s.id}
                          className={`service-option ${selectedService?.id === s.id ? 'selected' : ''}`}
                          onClick={() => { setSelectedService(s); setSelectedProvider(p); }}
                        >
                          <div className="service-option-info">
                            <span className="service-option-name">{s.name}</span>
                            <span className="service-option-meta">{s.duration_minutes} min • {s.category}</span>
                          </div>
                          <span className="service-option-price">{formatPrice(s.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="step-actions">
                <button className="btn btn-secondary" onClick={() => setStep(1)}>Voltar</button>
                <button className="btn btn-primary" disabled={!selectedService} onClick={() => setStep(3)}>Continuar</button>
              </div>
            </div>
          )}

          {/* STEP 3 — Date & Time */}
          {step === 3 && (
            <div className="datetime-section animate-fade-in">
              {/* Mini Calendar */}
              <div className="mini-calendar card">
                <div className="mini-calendar-header">
                  <button className="btn btn-ghost" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span className="mini-calendar-month">{MONTHS[calMonth]} {calYear}</span>
                  <button className="btn btn-ghost" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
                <div className="calendar-weekdays">
                  {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
                </div>
                <div className="calendar-grid">
                  {calDays.map((day, idx) => (
                    <button
                      key={idx}
                      className={`calendar-day ${!day ? 'empty' : ''} ${isTodayDay(day) ? 'today' : ''} ${isSelectedDay(day) ? 'selected' : ''} ${isPastDay(day) ? 'past-date' : ''}`}
                      onClick={() => selectDay(day)}
                      disabled={!day || isPastDay(day)}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots */}
              {selectedDate && (
                <div className="timeslots-section animate-fade-in">
                  <label>Horários disponíveis</label>
                  <div className="timeslots-grid">
                    {(() => {
                      const slots = getAvailableSlots();
                      return slots.length > 0 ? slots.map(t => (
                        <button key={t} className={`timeslot ${selectedTime === t ? 'active' : ''}`} onClick={() => setSelectedTime(t)}>{t}</button>
                      )) : <p className="no-timeslots">Nenhum horário disponível</p>;
                    })()}
                  </div>
                </div>
              )}

              <div className="step-actions">
                <button className="btn btn-secondary" onClick={() => setStep(2)}>Voltar</button>
                <button className="btn btn-primary" disabled={!selectedDate || !selectedTime} onClick={() => setStep(4)}>Continuar</button>
              </div>
            </div>
          )}

          {/* STEP 4 — Review */}
          {step === 4 && (
            <div className="review-section animate-fade-in">
              <div className="review-card card">
                <div className="review-item"><span className="review-label">Cliente</span><span className="review-value">{selectedClient?.name}</span></div>
                <div className="review-item"><span className="review-label">Email</span><span className="review-value">{selectedClient?.email}</span></div>
                <div className="review-item"><span className="review-label">Serviço</span><span className="review-value">{selectedService?.name}</span></div>
                <div className="review-item"><span className="review-label">Profissional</span><span className="review-value">{selectedProvider?.name}</span></div>
                <div className="review-item">
                  <span className="review-label">Data</span>
                  <span className="review-value">{selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}</span>
                </div>
                <div className="review-item"><span className="review-label">Horário</span><span className="review-value">{selectedTime}</span></div>
                <div className="review-item"><span className="review-label">Duração</span><span className="review-value">{selectedService?.duration_minutes} min</span></div>
                <div className="review-item"><span className="review-label">Valor</span><span className="review-value review-price">{formatPrice(selectedService?.price)}</span></div>
              </div>

              <div className="step-actions">
                <button className="btn btn-secondary" onClick={() => setStep(3)}>Voltar</button>
                <button className="btn btn-primary" disabled={submitting} onClick={handleSubmit}>
                  {submitting ? <div className="spinner" style={{ borderTopColor: '#111514' }} /> : 'Confirmar Agendamento'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Success State */}
      {tab === 'create' && success && (
        <div className="success-state animate-fade-in">
          <div className="success-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h3>Agendamento Criado!</h3>
          <p>O agendamento para <strong>{selectedClient?.name}</strong> foi criado com sucesso.</p>
          <button className="btn btn-primary" onClick={resetForm}>Novo Agendamento</button>
        </div>
      )}

      {/* ===== MANAGE TAB ===== */}
      {tab === 'manage' && (
        <div className="animate-fade-in">
          {loadingAppts ? (
            <div className="empty-state"><div className="spinner spinner-lg" /></div>
          ) : allAppointments.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <p>Nenhum agendamento encontrado</p>
            </div>
          ) : (
            <div className="appointments-list">
              {allAppointments.map((appt, idx) => {
                const isPending = appt.status?.toUpperCase() === 'PENDENTE';
                const isCancelled = appt.status?.toUpperCase() === 'CANCELADO';
                const statusClass = `status-${appt.status?.toLowerCase()}`;
                return (
                  <div key={appt.id} className={`appointment-card card animate-fade-in-up delay-${Math.min(idx + 1, 5)} ${statusClass}`} style={{ animationFillMode: 'both' }}>
                    <div className="appointment-card-main">
                      <div className="appointment-time-block">
                        <span className="appointment-time-start">{formatApptTime(appt.data_hora_inicio)}</span>
                        <span className="appointment-time-end">{formatApptTime(appt.data_hora_fim)}</span>
                      </div>
                      <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.8rem' }}>{appt.name_user?.charAt(0)?.toUpperCase()}</div>
                      <div className="appointment-info">
                        <span className="appointment-name">{appt.name_user}</span>
                        <span className="appointment-service-label">{appt.name_service} • {appt.name_provider} • {formatApptDate(appt.data_hora_inicio)}</span>
                      </div>
                      {getStatusBadge(appt.status)}
                      <div style={{ display: 'flex', gap: '8px', flex: 'none' }}>
                        {isPending && (
                          <button className="btn-confirm-sm" style={{ padding: '6px 12px' }} disabled={actioningId === appt.id}
                            onClick={(e) => { e.stopPropagation(); handleConfirmClick(appt); }} title="Confirmar">
                            {actioningId === appt.id && modal.type === 'confirm' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '✓'}
                          </button>
                        )}
                        {!isCancelled && (
                          <button className="btn-cancel-sm" style={{ padding: '6px 12px' }} disabled={actioningId === appt.id}
                            onClick={(e) => { e.stopPropagation(); handleCancelClick(appt); }} title="Cancelar">
                            {actioningId === appt.id && modal.type === 'cancel' ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '✕'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
