import React, { useState, useEffect } from 'react';
import { FileText, Activity, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AdminPage.css';

interface AdminNotification {
  id: number;
  type: 'Security' | 'Sync' | 'System';
  message: string;
  severity: 'Low' | 'Medium' | 'High';
  created_at: string;
  is_read: boolean;
}

export const AdminSystemPage: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'system' | 'logs' | 'notifications'>('system');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

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

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'notifications') fetchNotifications();
  }, [activeTab]);

  return (
    <div className="admin-container p-8">
      <div className="flex gap-4 mb-6">
          <button 
            className={`px-4 py-2 rounded-lg font-semibold border transition-colors flex items-center gap-2 ${activeTab === 'system' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('system')}
          >
            <Activity size={16} /> Data Pipeline
          </button>
          <button 
            className={`px-4 py-2 rounded-lg font-semibold border transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('logs')}
          >
             <FileText size={16} /> Audit Logs
          </button>
          <button 
            className={`px-4 py-2 rounded-lg font-semibold border transition-colors flex items-center gap-2 ${activeTab === 'notifications' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('notifications')}
          >
             <AlertCircle size={16} /> Notifications
             {notifications.some(n => !n.is_read) && <span className="w-2 h-2 rounded-full bg-red-500 inline-block ml-1"></span>}
          </button>
      </div>

      <div className="admin-content">
         {loading && activeTab === 'system' && <div className="admin-loading">Processing Request...</div>}

        {activeTab === 'system' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>Ingestion & AI Processing</h2>
            </div>
            <div className="system-grid">
              <div className="system-card bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg font-bold mb-2">Hansard Ingestion</h3>
                <p className="text-gray-600 mb-4 text-sm">Crawl parliament.go.ke for the latest transcripts and split into speaker segments.</p>
                <button 
                  className="trigger-btn flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50" 
                  onClick={triggerIngest}
                  disabled={loading}
                >
                  <RefreshCw className={loading ? 'spin' : ''} size={16} /> 
                  Trigger Full Hansard Sync
                </button>
              </div>
              <div className="system-card bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 opacity-60">
                <h3 className="text-lg font-bold mb-2">Manual Vectorization</h3>
                <p className="text-gray-600 mb-4 text-sm">Force re-embedding of all speech segments for RAG optimization.</p>
                <button className="trigger-btn bg-gray-200 text-gray-500 font-semibold px-4 py-2 rounded-lg cursor-not-allowed" disabled>Coming Soon</button>
              </div>
            </div>
            {message && (
              <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
                {message.type === 'error' ? <AlertCircle size={18} /> : <ShieldCheck size={18} />}
                {message.text}
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>System Audit Logs</h2>
              <button className="refresh-btn" onClick={fetchLogs}><RefreshCw size={14} /></button>
            </div>
            <div className="logs-viewer bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto h-[500px] overflow-y-auto font-mono text-sm leading-relaxed border border-gray-800">
              <pre>{logs || 'Initializing logs...'}</pre>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="admin-section">
            <div className="section-header">
              <h2>System Notifications</h2>
              <button className="refresh-btn" onClick={fetchNotifications}><RefreshCw size={14} /></button>
            </div>
            <div className="notifications-list flex flex-col gap-3">
              {notifications.length === 0 ? (
                <div className="no-notifications p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">No notifications found. System is healthy.</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className={`notification-item p-4 rounded-lg border-l-4 flex flex-col gap-2 ${n.severity === 'High' ? 'bg-red-50 border-red-500' : n.severity === 'Medium' ? 'bg-yellow-50 border-yellow-500' : 'bg-blue-50 border-blue-500'} ${n.is_read ? 'opacity-70 bg-gray-50 border-gray-300' : ''}`}>
                    <div className="notif-header flex justify-between items-center">
                      <span className="notif-type font-bold text-sm tracking-wider uppercase text-gray-700">{n.type}</span>
                      <span className="notif-time text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <div className="notif-body">
                      <p className="text-gray-800 text-sm mb-2">{n.message}</p>
                      {!n.is_read && (
                        <button className="mark-read-btn text-xs font-semibold text-blue-600 hover:text-blue-800 underline" onClick={() => markNotificationRead(n.id)}>
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
