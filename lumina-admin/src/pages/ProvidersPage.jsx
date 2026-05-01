import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import './ProvidersPage.css';

export default function ProvidersPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [toast, setToast] = useState(null);

  // Create form
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit form
  const [editBio, setEditBio] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Photo upload
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const fetchProviders = useCallback(() => {
    setLoading(true);
    api.get('/providers/')
      .then(res => setProviders(res.data))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function searchUser() {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchError('');
    setFoundUser(null);
    try {
      const res = await api.get(`/users/email?email=${encodeURIComponent(searchEmail.trim())}`);
      setFoundUser(res.data);
    } catch {
      setSearchError('Usuário não encontrado');
    } finally {
      setSearching(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!foundUser) return;
    setCreating(true);
    try {
      await api.post('/providers/', {
        user_id: foundUser.id,
        bio,
        specialty,
      });
      showToast('Provider criado com sucesso!');
      closeCreateModal();
      fetchProviders();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erro ao criar provider', 'error');
    } finally {
      setCreating(false);
    }
  }

  function openEditModal(provider) {
    setEditingProvider(provider);
    setEditBio(provider.bio || '');
    setEditSpecialty(provider.specialty || '');
    setShowEditModal(true);
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!editingProvider) return;
    setEditSaving(true);
    try {
      await api.patch(`/providers/${editingProvider.id}`, {
        bio: editBio,
        specialty: editSpecialty,
      });
      showToast('Provider atualizado!');
      closeEditModal();
      fetchProviders();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erro ao atualizar', 'error');
    } finally {
      setEditSaving(false);
    }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/users/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Foto atualizada!');
      fetchProviders();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erro ao enviar foto', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function toggleStatus(provider) {
    try {
      if (provider.operando === 'ATIVO') {
        await api.delete(`/providers/${provider.id}`);
      } else {
        await api.patch(`/providers/${provider.id}/reactivate`);
      }
      fetchProviders();
      showToast(`Provider ${provider.operando === 'ATIVO' ? 'desativado' : 'reativado'}!`);
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erro ao alterar status', 'error');
    }
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setSearchEmail('');
    setFoundUser(null);
    setSearchError('');
    setBio('');
    setSpecialty('');
  }

  function closeEditModal() {
    setShowEditModal(false);
    setEditingProvider(null);
    setEditBio('');
    setEditSpecialty('');
  }

  return (
    <div className="providers-page animate-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">Providers</h2>
          <p className="page-description">Gerencie os profissionais do sistema</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Provider
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner spinner-lg" /></div>
      ) : providers.length === 0 ? (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p>Nenhum provider cadastrado</p>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>Criar primeiro provider</button>
        </div>
      ) : (
        <div className="providers-grid">
          {providers.map((p, idx) => (
            <div key={p.id} className={`provider-card card animate-fade-in-up delay-${Math.min(idx + 1, 5)}`} style={{ animationFillMode: 'both' }}>
              {/* Avatar + Upload */}
              <div className="provider-avatar-area">
                <div className="provider-avatar-wrapper">
                  {p.profile_picture ? (
                    <img
                      src={`http://127.0.0.1:8000${p.profile_picture}`}
                      alt={p.name}
                      className="provider-avatar-img"
                    />
                  ) : (
                    <div className="provider-avatar-placeholder">
                      {p.name?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <button
                    className="avatar-upload-btn"
                    title="Enviar foto"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                  >
                    {uploadingPhoto ? (
                      <div className="spinner" style={{ width: 14, height: 14 }} />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handlePhotoUpload}
                />
              </div>

              {/* Info + badge */}
              <div className="provider-card-info">
                <div className="provider-card-top">
                  <div className="provider-info">
                    <span className="provider-name">{p.name}</span>
                    <span className="provider-specialty">{p.specialty}</span>
                  </div>
                  <span className={`badge ${p.operando === 'ATIVO' ? 'badge-active' : 'badge-inactive'}`}>
                    {p.operando}
                  </span>
                </div>
                <p className="provider-bio">{p.bio}</p>
                <div className="provider-actions">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => openEditModal(p)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Editar
                  </button>
                  <button
                    className={`btn btn-sm ${p.operando === 'ATIVO' ? 'btn-danger' : 'btn-primary'}`}
                    onClick={() => toggleStatus(p)}
                  >
                    {p.operando === 'ATIVO' ? 'Desativar' : 'Reativar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Novo Provider</h3>
              <button className="modal-close" onClick={closeCreateModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form className="modal-body" onSubmit={handleCreate}>
              <div className="input-group">
                <label>Buscar usuário por e-mail</label>
                <div className="search-row">
                  <input
                    className="input-field"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={searchUser} disabled={searching}>
                    {searching ? <div className="spinner" /> : 'Buscar'}
                  </button>
                </div>
                {searchError && <span className="input-error">{searchError}</span>}
              </div>

              {foundUser && (
                <div className="found-user card">
                  <div className="avatar">{foundUser.name?.charAt(0)?.toUpperCase()}</div>
                  <div>
                    <strong>{foundUser.name}</strong>
                    <span className="found-user-email">{foundUser.email}</span>
                  </div>
                </div>
              )}

              <div className="input-group">
                <label>Especialidade</label>
                <input className="input-field" placeholder="Ex: Dentista, Barbeiro..." value={specialty} onChange={e => setSpecialty(e.target.value)} required />
              </div>

              <div className="input-group">
                <label>Bio</label>
                <textarea className="input-field" rows={3} placeholder="Breve descrição do profissional..." value={bio} onChange={e => setBio(e.target.value)} required />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeCreateModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={!foundUser || creating}>
                  {creating ? <div className="spinner" style={{ borderTopColor: '#111514' }} /> : 'Criar Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingProvider && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Editar Provider</h3>
              <button className="modal-close" onClick={closeEditModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <form className="modal-body" onSubmit={handleEdit}>
              <div className="edit-provider-user">
                <div className="avatar avatar-lg">
                  {editingProvider.name?.charAt(0)?.toUpperCase()}
                </div>
                <span className="provider-name">{editingProvider.name}</span>
              </div>

              <div className="input-group">
                <label>Especialidade</label>
                <input
                  className="input-field"
                  placeholder="Ex: Dentista, Barbeiro..."
                  value={editSpecialty}
                  onChange={e => setEditSpecialty(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Bio</label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Breve descrição do profissional..."
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeEditModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={editSaving}>
                  {editSaving ? <div className="spinner" style={{ borderTopColor: '#111514' }} /> : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
