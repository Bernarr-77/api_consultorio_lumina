import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import './ServicesPage.css';

const CATEGORIES = ['ESTETICO', 'ODONTOLOGICO'];

export default function ServicesPage() {
  const [providers, setProviders] = useState([]);
  const [servicesByProvider, setServicesByProvider] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  // Form
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [name, setName] = useState('');
  const [duration, setDuration] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('ESTETICO');
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const provRes = await api.get('/providers/');
      setProviders(provRes.data);
      const svcMap = {};
      for (const p of provRes.data) {
        try {
          const svcRes = await api.get(`/services/${p.id}`);
          svcMap[p.id] = svcRes.data;
        } catch {
          svcMap[p.id] = [];
        }
      }
      setServicesByProvider(svcMap);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function openCreate() {
    setEditingService(null);
    setSelectedProviderId(providers[0]?.id || '');
    setName('');
    setDuration('');
    setPrice('');
    setCategory('ESTETICO');
    setShowModal(true);
  }

  function openEdit(service) {
    setEditingService(service);
    setSelectedProviderId(service.provider_id);
    setName(service.name);
    setDuration(String(service.duration_minutes));
    setPrice(String(service.price));
    setCategory(service.category);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setShowConfirm(false);
    setEditingService(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingService) {
        await api.patch(`/services/${editingService.provider_id}/${editingService.id}`, {
          name,
          duration_minutes: parseInt(duration),
          price: parseFloat(price),
          category,
        });
        showToast('Serviço atualizado!');
      } else {
        await api.post('/services/', {
          provider_id: parseInt(selectedProviderId),
          name,
          duration_minutes: parseInt(duration),
          price: parseFloat(price),
          category,
        });
        showToast('Serviço criado!');
      }
      closeModal();
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erro ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteClick() {
    setShowConfirm(true);
  }

  async function executeDelete() {
    if (!editingService) return;
    
    setSaving(true);
    try {
      await api.delete(`/services/${editingService.provider_id}/${editingService.id}`);
      showToast('Serviço excluído com sucesso!');
      setShowConfirm(false);
      closeModal();
      fetchAll();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erro ao excluir serviço', 'error');
    } finally {
      setSaving(false);
    }
  }

  function formatPrice(val) {
    return parseFloat(val).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  return (
    <div className="services-page animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Serviços</h2>
          <p className="page-description">Gerencie os serviços oferecidos por cada provider</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} disabled={providers.length === 0}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Serviço
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner spinner-lg" /></div>
      ) : providers.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4"/>
          </svg>
          <p>Cadastre um provider primeiro para criar serviços</p>
        </div>
      ) : (
        <div className="services-groups">
          {providers.map((provider, pIdx) => {
            const svcs = servicesByProvider[provider.id] || [];
            return (
              <div key={provider.id} className={`service-group animate-fade-in-up delay-${Math.min(pIdx + 1, 5)}`} style={{ animationFillMode: 'both' }}>
                <div className="service-group-header">
                  <div className="avatar">{provider.name?.charAt(0)?.toUpperCase()}</div>
                  <div>
                    <h4 className="service-group-name">{provider.name}</h4>
                    <span className="service-group-specialty">{provider.specialty}</span>
                  </div>
                  <span className="service-group-count">{svcs.length} serviço{svcs.length !== 1 ? 's' : ''}</span>
                </div>

                {svcs.length === 0 ? (
                  <p className="service-group-empty">Nenhum serviço cadastrado</p>
                ) : (
                  <div className="service-cards">
                    {svcs.map(svc => (
                      <div key={svc.id} className="service-card card card-interactive" onClick={() => openEdit(svc)}>
                        <div className="service-card-top">
                          <span className="service-name">{svc.name}</span>
                          <span className={`badge ${svc.category === 'ESTETICO' ? 'badge-confirmed' : 'badge-pending'}`}>
                            {svc.category === 'ESTETICO' ? '💆 Estético' : '🦷 Odontológico'}
                          </span>
                        </div>
                        <div className="service-card-details">
                          <span className="service-price">{formatPrice(svc.price)}</span>
                          <span className="service-duration">{svc.duration_minutes} min</span>
                        </div>
                        <div className="service-edit-hint">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Editar
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingService ? 'Editar Serviço' : 'Novo Serviço'}</h3>
              <button className="modal-close" onClick={closeModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              {!editingService && (
                <div className="input-group">
                  <label>Provider</label>
                  <select className="input-field" value={selectedProviderId} onChange={e => setSelectedProviderId(e.target.value)} required>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {p.specialty}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="input-group">
                <label>Nome do Serviço</label>
                <input className="input-field" placeholder="Ex: Corte Degradê" value={name} onChange={e => setName(e.target.value)} required />
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Duração (min)</label>
                  <input className="input-field" type="number" placeholder="30" min="1" max="1440" value={duration} onChange={e => setDuration(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label>Preço (R$)</label>
                  <input className="input-field" type="number" step="0.01" placeholder="50.00" min="0" value={price} onChange={e => setPrice(e.target.value)} required />
                </div>
              </div>

              <div className="input-group">
                <label>Categoria</label>
                <div className="category-selector">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`category-btn ${category === cat ? 'active' : ''}`}
                      onClick={() => setCategory(cat)}
                    >
                      {cat === 'ESTETICO' ? '💆 Estético' : '🦷 Odontológico'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-actions" style={{ justifyContent: editingService ? 'space-between' : 'flex-end', width: '100%' }}>
                {editingService && (
                  <button type="button" className="btn btn-secondary" style={{ color: 'var(--error)', borderColor: 'rgba(229,57,53,0.3)', backgroundColor: 'transparent' }} onClick={handleDeleteClick} disabled={saving}>
                    Excluir
                  </button>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <div className="spinner" style={{ borderTopColor: '#111514' }} /> : (editingService ? 'Salvar' : 'Criar Serviço')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {showConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1100, backgroundColor: 'rgba(0, 0, 0, 0.7)' }} onClick={() => setShowConfirm(false)}>
          <div className="modal-content animate-fade-in-up" style={{ maxWidth: '400px', padding: '32px 24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'rgba(229,57,53,0.12)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18"></path>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--text-primary)', fontWeight: '600' }}>Excluir Serviço</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.5' }}>
                  Tem certeza que deseja excluir o serviço <strong style={{ color: 'var(--text-primary)' }}>"{editingService?.name}"</strong>? Esta ação não poderá ser desfeita.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '12px' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, height: '48px' }} 
                  onClick={() => setShowConfirm(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 1, height: '48px', backgroundColor: 'var(--error)', color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(229, 57, 53, 0.25)' }} 
                  onClick={executeDelete}
                  disabled={saving}
                >
                  {saving ? <div className="spinner" style={{ borderTopColor: 'rgba(255,255,255,0.3)', borderRightColor: 'white' }} /> : 'Sim, excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
