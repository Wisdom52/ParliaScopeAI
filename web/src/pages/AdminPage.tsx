import React, { useState, useEffect } from 'react';
import { Users, FileText, Activity, RefreshCw, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AdminPage.css';

interface UserData {
  id: number;
  email: string | null;
  full_name: string | null;
  id_number: string | null;
  is_admin: boolean;
  is_active: boolean;
}

interface AdminNotification {
  id: number;
  type: 'Security' | 'Sync' | 'System';
  message: string;
  severity: 'Low' | 'Medium' | 'High';
  created_at: string;
  is_read: boolean;
}

interface LogData {
  logs: string;
}

export const AdminPage: React.FC = () => {
  const { token } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'logs' | 'system' | 'notifications'>('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/admin/logs?lines=200', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/admin/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationRead = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8000/admin/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const triggerIngest = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('http://localhost:8000/admin/ingest/hansard', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: `Ingestion triggered: ${data.summary?.total_processed || 0} processed.` });
      } else {
        setMessage({ type: 'error', text: 'Failed to trigger ingestion.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error connecting to server.' });
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
        setMessage({ type: 'success', text: `User ${email} has been deleted.` });
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'users') fetchUsers();
    if (activeSubTab === 'logs') fetchLogs();
    if (activeSubTab === 'notifications') fetchNotifications();
  }, [activeSubTab]);

  const { user: currentAdmin } = useAuth();

  return (
    <div className="admin-container">
      <header className="admin-header">
        <div className="admin-title">
          <ShieldCheck className="admin-title-icon" />
          <h1>System Control Room</h1>
        </div>
        <p className="admin-subtitle">Confidential access for authorized operators only.</p>
      </header>

      <div className="admin-tabs">
        <button 
          className={`admin-tab ${activeSubTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('users')}
        >
          <Users size={18} /> Citizens
        </button>
        <button 
          id="admin-tab-logs"
          className={`admin-tab ${activeSubTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('logs')}
        >
          <FileText size={18} /> Audit Logs
        </button>
        <button 
          id="admin-tab-system"
          className={`admin-tab ${activeSubTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('system')}
        >
          <Activity size={18} /> Data Pipeline
        </button>
        <button 
          id="admin-tab-notifications"
          className={`admin-tab ${activeSubTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('notifications')}
        >
          <div className="tab-with-badge">
            <AlertCircle size={18} /> Notifications
            {notifications.some(n => !n.is_read) && <span className="unread-dot"></span>}
          </div>
        </button>
      </div>

      <div className="admin-content">
        {loading && <div className="admin-loading">Processing...</div>}

        {activeSubTab === 'users' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Registered Citizens ({users.length})</h2>
              <button className="refresh-btn" onClick={fetchUsers}><RefreshCw size={14} /></button>
            </div>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Full Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
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
                          <button 
                            className="action-btn role" 
                            title={u.is_admin ? "Demote to Citizen" : "Promote to Admin"}
                            onClick={() => handleRoleToggle(u.id)}
                            disabled={u.id === currentAdmin?.id}
                          >
                            <ShieldCheck size={16} />
                          </button>
                          <button 
                            className={`action-btn status ${u.is_active ? 'pause' : 'resume'}`}
                            title={u.is_active ? "Pause Account" : "Activate Account"}
                            onClick={() => handleStatusToggle(u.id)}
                            disabled={u.id === currentAdmin?.id}
                          >
                            <AlertCircle size={16} />
                          </button>
                          <button 
                            className="action-btn delete" 
                            title="Delete User"
                            onClick={() => handleDeleteUser(u.id, u.email || '')}
                            disabled={u.id === currentAdmin?.id}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'logs' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>System Audit Logs</h2>
              <button className="refresh-btn" onClick={fetchLogs}><RefreshCw size={14} /></button>
            </div>
            <div className="logs-viewer">
              <pre>{logs || 'Initializing logs...'}</pre>
            </div>
          </div>
        )}

        {activeSubTab === 'system' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Ingestion & AI Processing</h2>
            </div>
            <div className="system-grid">
              <div className="system-card">
                <h3>Hansard Ingestion</h3>
                <p>Crawl parliament.go.ke for the latest transcripts and split into speakers.</p>
                <button 
                  className="trigger-btn" 
                  onClick={triggerIngest}
                  disabled={loading}
                >
                  <RefreshCw className={loading ? 'spin' : ''} size={18} /> 
                  Trigger Full Hansard Sync
                </button>
              </div>
              <div className="system-card disabled">
                <h3>Manual Vectorization</h3>
                <p>Force re-embedding of all speech segments for RAG optimization.</p>
                <button className="trigger-btn" disabled>Coming Soon</button>
              </div>
            </div>
            {message && (
              <div className={`admin-message ${message.type}`}>
                {message.type === 'error' ? <AlertCircle size={18} /> : <ShieldCheck size={18} />}
                {message.text}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'notifications' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>System Notifications</h2>
              <button className="refresh-btn" onClick={fetchNotifications}><RefreshCw size={14} /></button>
            </div>
            <div className="notifications-list">
              {notifications.length === 0 ? (
                <div className="no-notifications">No notifications found. System is healthy.</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`notification-item ${n.severity.toLowerCase()} ${n.is_read ? 'read' : 'unread'}`}>
                    <div className="notif-header">
                      <span className="notif-type">{n.type}</span>
                      <span className="notif-time">{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <div className="notif-body">
                      <p>{n.message}</p>
                      {!n.is_read && (
                        <button className="mark-read-btn" onClick={() => markNotificationRead(n.id)}>
                          Mark as Read
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
