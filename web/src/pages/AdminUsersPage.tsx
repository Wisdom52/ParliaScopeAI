import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Trash2, ShieldCheck, AlertCircle, Search, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AdminPage.css';

interface UserData {
  id: number;
  email: string | null;
  full_name: string | null;
  id_number: string | null;
  is_admin: boolean;
  is_active: boolean;
  role: string;
}

interface LeaderClaim {
  id: number;
  user_id: number;
  user_email: string;
  speaker_id: number;
  speaker_name: string;
  speaker_role: string;
  maisha_card_url: string | null;
  staff_card_url: string | null;
  created_at: string;
}

interface VerifiedLeader {
  id: number;
  email: string;
  full_name: string | null;
  speaker_name: string;
  speaker_role: string;
  is_active: boolean;
}

const PAGE_SIZE = 15;

interface Props {
  initialFilter?: 'active' | 'paused' | null;
}

export const AdminUsersPage: React.FC<Props> = ({ initialFilter }) => {
  const { token, user: currentAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [pendingLeaders, setPendingLeaders] = useState<LeaderClaim[]>([]);
  const [activeLeaders, setActiveLeaders] = useState<VerifiedLeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<LeaderClaim | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'citizens' | 'leaders'>('citizens');

  // ── Scalability: Search + Filter + Pagination ──
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>(initialFilter ?? 'all');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Bulk Actions ──
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaders = async () => {
    setLoading(true);
    try {
      const pRes = await fetch('http://localhost:8000/admin/leaders/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (pRes.ok) setPendingLeaders(await pRes.json());

      const aRes = await fetch('http://localhost:8000/admin/leaders/active', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (aRes.ok) setActiveLeaders(await aRes.json());
    } catch (error) {
      console.error('Failed to fetch leaders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !u.is_admin } : u));
      }
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleStatusToggle = async (userId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !u.is_active } : u));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete user ${email}? This action cannot be undone.`)) return;
    try {
      const response = await fetch(`http://localhost:8000/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setSelectedIds(prev => { const s = new Set(prev); s.delete(userId); return s; });
        setMessage({ type: 'success', text: `User ${email} has been deleted.` });
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  // ── Bulk Action Handlers ──
  const handleBulkPause = async () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`Pause ${selectedIds.size} selected account(s)?`)) return;
    const targets = [...selectedIds];
    for (const id of targets) {
      const u = users.find(u => u.id === id);
      if (u && u.is_active) await handleStatusToggle(id);
    }
    setSelectedIds(new Set());
    setMessage({ type: 'success', text: `${targets.length} account(s) paused.` });
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    if (!window.confirm(`PERMANENTLY delete ${selectedIds.size} selected account(s)? This cannot be undone.`)) return;
    const targets = [...selectedIds];
    for (const id of targets) {
      const u = users.find(u => u.id === id);
      if (u && u.id !== currentAdmin?.id) {
        await fetch(`http://localhost:8000/admin/users/${id}`, {
          method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    }
    setUsers(prev => prev.filter(u => !selectedIds.has(u.id)));
    setSelectedIds(new Set());
    setMessage({ type: 'success', text: `${targets.length} account(s) deleted.` });
  };

  const handleAuthorizeLeader = async (claimId: number) => {
    try {
      const resp = await fetch(`http://localhost:8000/admin/leaders/${claimId}/authorize`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) {
        setMessage({ type: 'success', text: "Leader identity authorized successfully." });
        fetchLeaders();
      }
    } catch (error) {
      console.error('Failed to authorize leader:', error);
    }
  };

  const handleToggleLeaderStatus = async (userId: number) => {
    try {
      const resp = await fetch(`http://localhost:8000/admin/leaders/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (resp.ok) { fetchLeaders(); }
    } catch (error) {
      console.error('Failed to toggle leader status:', error);
    }
  };

  useEffect(() => {
    if (activeTab === 'citizens') fetchUsers();
    if (activeTab === 'leaders') fetchLeaders();
    setSelectedIds(new Set());
    setCurrentPage(1);
  }, [activeTab]);

  // ── Derived: filtered + paginated citizens ──
  const citizenList = useMemo(() => users.filter(u => u.role !== 'LEADER'), [users]);

  const filteredUsers = useMemo(() => {
    let list = citizenList;
    if (statusFilter === 'active') list = list.filter(u => u.is_active);
    if (statusFilter === 'paused') list = list.filter(u => !u.is_active);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(u =>
        u.email?.toLowerCase().includes(q) || u.full_name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [citizenList, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageUsers = filteredUsers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allPageSelected = pageUsers.length > 0 && pageUsers.every(u => selectedIds.has(u.id));
  const togglePageSelect = () => {
    if (allPageSelected) {
      setSelectedIds(prev => { const s = new Set(prev); pageUsers.forEach(u => s.delete(u.id)); return s; });
    } else {
      setSelectedIds(prev => { const s = new Set(prev); pageUsers.forEach(u => s.add(u.id)); return s; });
    }
  };

  return (
    <div className="admin-container p-8">
      <div className="flex gap-4 mb-6">
          <button 
            className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${activeTab === 'citizens' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('citizens')}
          >Manage Citizens</button>
          <button 
            className={`px-4 py-2 rounded-lg font-semibold border transition-colors ${activeTab === 'leaders' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('leaders')}
          >Manage Leaders</button>
      </div>

      <div className="admin-content">
        {loading && <div className="admin-loading">Processing...</div>}
        {message && (
            <div className={`p-4 rounded-lg mb-6 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {message.text}
            </div>
        )}

        {activeTab === 'citizens' && (
          <div className="admin-section">
            {/* ── Toolbar: Search + Filter + Bulk Actions ── */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 34px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '0.875rem' }}
                />
              </div>
              
              {/* Status filter pills */}
              <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
                {(['all', 'active', 'paused'] as const).map(f => (
                  <button key={f} onClick={() => { setStatusFilter(f); setCurrentPage(1); }}
                    style={{ padding: '4px 14px', borderRadius: '6px', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      background: statusFilter === f ? 'white' : 'transparent',
                      color: statusFilter === f ? (f === 'paused' ? '#dc2626' : f === 'active' ? '#059669' : '#374151') : '#6b7280',
                      boxShadow: statusFilter === f ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                    }}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              <div className="section-header" style={{ flex: 'none', margin: 0 }}>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
                <button className="refresh-btn" onClick={fetchUsers}><RefreshCw size={14} /></button>
              </div>
            </div>

            {/* ── Bulk Action Bar (visible when rows selected) ── */}
            {selectedIds.size > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '10px 16px', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1d4ed8' }}>{selectedIds.size} selected</span>
                <button onClick={handleBulkPause}
                  style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', background: '#f59e0b', color: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                  Pause Selected
                </button>
                <button onClick={handleBulkDelete}
                  style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', background: '#dc2626', color: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                  Delete Selected
                </button>
                <button onClick={() => setSelectedIds(new Set())}
                  style={{ padding: '5px 14px', borderRadius: '6px', border: '1px solid #d1d5db', background: 'white', color: '#374151', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', marginLeft: 'auto' }}>
                  Clear
                </button>
              </div>
            )}

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <button onClick={togglePageSelect} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        {allPageSelected ? <CheckSquare size={16} color="#2563eb" /> : <Square size={16} color="#9ca3af" />}
                      </button>
                    </th>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageUsers.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>No users match your filter.</td></tr>
                  ) : pageUsers.map(u => (
                    <tr key={u.id} style={{ background: selectedIds.has(u.id) ? '#eff6ff' : undefined }}>
                      <td>
                        <button onClick={() => setSelectedIds(prev => { const s = new Set(prev); s.has(u.id) ? s.delete(u.id) : s.add(u.id); return s; })}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                          {selectedIds.has(u.id) ? <CheckSquare size={16} color="#2563eb" /> : <Square size={16} color="#9ca3af" />}
                        </button>
                      </td>
                      <td>{u.id}</td>
                      <td>{u.full_name || 'Guest'}</td>
                      <td>{u.email || '-'}</td>
                      <td>
                        <span className={`status-pill ${u.is_active ? 'active' : 'paused'}`}>
                          {u.is_active ? 'Active' : 'Paused'}
                        </span>
                      </td>
                      <td>
                        <span className={`role-badge ${u.is_admin ? 'admin' : 'user'}`}>
                          {u.is_admin ? 'Admin' : 'Citizen'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions">
                          <button className="action-btn role" title={u.is_admin ? "Demote to Citizen" : "Promote to Admin"}
                            onClick={() => handleRoleToggle(u.id)} disabled={u.id === currentAdmin?.id}>
                            <ShieldCheck size={16} />
                          </button>
                          <button className={`action-btn status ${u.is_active ? 'pause' : 'resume'}`}
                            title={u.is_active ? "Pause Account" : "Activate Account"}
                            onClick={() => handleStatusToggle(u.id)} disabled={u.id === currentAdmin?.id}>
                            <AlertCircle size={16} />
                          </button>
                          <button className="action-btn delete" title="Delete User"
                            onClick={() => handleDeleteUser(u.id, u.email || '')} disabled={u.id === currentAdmin?.id}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', padding: '0 4px' }}>
                <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                  Page {safePage} of {totalPages} ({filteredUsers.length} total)
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: safePage === 1 ? 0.4 : 1 }}>
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let p = i + 1;
                    if (totalPages > 7) {
                      const start = Math.max(1, safePage - 3);
                      p = start + i;
                      if (p > totalPages) return null;
                    }
                    return (
                      <button key={p} onClick={() => setCurrentPage(p)}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', fontWeight: p === safePage ? 700 : 400,
                          background: p === safePage ? '#2563eb' : 'white', color: p === safePage ? 'white' : '#374151', cursor: 'pointer' }}>
                        {p}
                      </button>
                    );
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: safePage === totalPages ? 0.4 : 1 }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaders' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Official Profile Claims (Pending: {pendingLeaders.length})</h2>
              <button className="refresh-btn" onClick={fetchLeaders}><RefreshCw size={14} /></button>
            </div>
            
            {pendingLeaders.length > 0 && (
              <div className="admin-table-wrapper mb-8">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Claiming Profile</th>
                      <th>Docs</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLeaders.map(p => (
                      <tr key={p.id}>
                        <td>{p.user_email}</td>
                        <td>{p.speaker_name} ({p.speaker_role})</td>
                        <td>
                          <div className="flex gap-2">
                            {p.maisha_card_url && <span className="doc-link text-blue-600 underline text-sm cursor-pointer">Photo 1</span>}
                            {p.staff_card_url && <span className="doc-link text-blue-600 underline text-sm cursor-pointer ml-2">Photo 2</span>}
                          </div>
                        </td>
                        <td>
                          <button className="authorize-btn bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-semibold hover:bg-blue-700"
                            onClick={() => { setSelectedClaim(p); setIsReviewModalOpen(true); }}>
                            Review &amp; Authorize
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="section-header mt-8">
              <h2>Verified Leaders ({activeLeaders.length})</h2>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Official Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLeaders.map(l => (
                    <tr key={l.id}>
                      <td><strong>{l.speaker_name}</strong><br/><small className="text-gray-500">{l.speaker_role}</small></td>
                      <td>{l.email}</td>
                      <td>
                        <span className={`status-pill ${l.is_active ? 'active' : 'paused'}`}>
                          {l.is_active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td>
                        <button className={`action-btn status ${l.is_active ? 'pause' : 'resume'}`}
                          onClick={() => handleToggleLeaderStatus(l.id)}>
                          <AlertCircle size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {isReviewModalOpen && selectedClaim && (
        <div className="modal-overlay">
          <div className="admin-modal max-w-2xl">
            <div className="modal-header">
              <h3>Verify Leader Identity</h3>
              <button onClick={() => setIsReviewModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="claim-details bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                <p><strong>Account Email:</strong> {selectedClaim.user_email}</p>
                <p><strong>Official Identity:</strong> {selectedClaim.speaker_name} ({selectedClaim.speaker_role})</p>
                <p><strong>Submitted On:</strong> {new Date(selectedClaim.created_at).toLocaleString()}</p>
              </div>

              <div className="verification-images grid grid-cols-2 gap-4">
                <div className="image-box text-center">
                  <p className="font-semibold mb-2">Maisha Card Photo</p>
                  {selectedClaim.maisha_card_url ? (
                    <img src={`http://localhost:8000/${selectedClaim.maisha_card_url}`} alt="Maisha Card" className="max-w-full h-auto rounded border" />
                  ) : (
                    <div className="missing-doc p-8 bg-gray-100 text-gray-500 rounded border border-dashed border-gray-300">No Image Provided</div>
                  )}
                </div>
                <div className="image-box text-center">
                  <p className="font-semibold mb-2">Staff ID Photo</p>
                  {selectedClaim.staff_card_url ? (
                    <img src={`http://localhost:8000/${selectedClaim.staff_card_url}`} alt="Staff ID" className="max-w-full h-auto rounded border" />
                  ) : (
                    <div className="missing-doc p-8 bg-gray-100 text-gray-500 rounded border border-dashed border-gray-300">No Image Provided</div>
                  )}
                </div>
              </div>

              <div className="modal-actions mt-8 flex justify-end gap-3 border-t pt-4">
                <button className="modal-btn cancel px-4 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 font-semibold" onClick={() => setIsReviewModalOpen(false)}>Close Review</button>
                <button className="modal-btn approve px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                    onClick={() => { handleAuthorizeLeader(selectedClaim.id); setIsReviewModalOpen(false); }}>
                    Authorize Official Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
