import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FileText, Activity, RefreshCw, ShieldCheck, AlertCircle, Search, BookOpen, Cpu, HardDrive, Database, Server } from 'lucide-react';
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

interface AuditLog {
  id: number;
  admin_id: number;
  action: string;
  target_user_id: number | null;
  details: string | null;
  created_at: string;
}

interface HealthData {
  cpu: { percent: number; core_count: number };
  ram: { total_gb: number; used_gb: number; percent: number };
  disk: { total_gb: number; used_gb: number; percent: number };
  database: { ok: boolean; latency_ms: number; pool: { checkedin: number; checkedout: number; size: number; overflow: number } };
  uptime_seconds: number;
}

const ACTION_COLORS: Record<string, string> = {
  ROLE_CHANGED:       '#7c3aed',
  STATUS_CHANGED:     '#d97706',
  USER_DELETED:       '#dc2626',
  LEADER_AUTHORIZED:  '#059669',
  LEADER_PAUSED:      '#d97706',
  LEADER_RESUMED:     '#059669',
};

// ── Reusable Gauge Bar ──
const GaugeBar: React.FC<{ label: string; value: number; max?: number; unit?: string; color?: string; subLabel?: string }> = ({
  label, value, max = 100, unit = '%', color, subLabel
}) => {
  const pct = Math.min(100, (value / max) * 100);
  const barColor = color ?? (pct > 85 ? '#dc2626' : pct > 60 ? '#f59e0b' : '#22c55e');
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.875rem' }}>
        <span style={{ fontWeight: 600, color: '#374151' }}>{label}</span>
        <span style={{ color: barColor, fontWeight: 700 }}>{value}{unit}{subLabel ? ` — ${subLabel}` : ''}</span>
      </div>
      <div style={{ height: '10px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: '99px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
};

const formatUptime = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
};

export const AdminSystemPage: React.FC = () => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'health' | 'system' | 'logs' | 'notifications' | 'audits'>('health');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState(false);
  const [logs, setLogs] = useState<string>('');
  const [logSearch, setLogSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const healthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Health fetch ──
  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError(false);
    try {
      const res = await fetch('http://localhost:8000/admin/health', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setHealth(await res.json());
      else setHealthError(true);
    } catch {
      setHealthError(true);
    } finally {
      setHealthLoading(false);
    }
  };

  // Auto-refresh health every 10s when on health tab
  useEffect(() => {
    if (activeTab === 'health') {
      fetchHealth();
      healthIntervalRef.current = setInterval(fetchHealth, 10000);
    } else {
      if (healthIntervalRef.current) clearInterval(healthIntervalRef.current);
    }
    return () => { if (healthIntervalRef.current) clearInterval(healthIntervalRef.current); };
  }, [activeTab]);

  const filteredLogLines = useMemo(() => {
    if (!logs) return '';
    if (!logSearch.trim()) return logs;
    return logs.split('\n').filter(line => line.toLowerCase().includes(logSearch.toLowerCase())).join('\n');
  }, [logs, logSearch]);

  const filteredAudits = useMemo(() => {
    if (!auditSearch.trim()) return auditLogs;
    const q = auditSearch.toLowerCase();
    return auditLogs.filter(a => a.action.toLowerCase().includes(q) || (a.details && a.details.toLowerCase().includes(q)));
  }, [auditLogs, auditSearch]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/admin/logs?lines=200', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setLogs((await response.json()).logs);
    } catch (error) { console.error('Failed to fetch logs:', error); } finally { setLoading(false); }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/admin/notifications', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setNotifications(await response.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/admin/audit-logs', { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setAuditLogs(await response.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const triggerIngest = async () => {
    setLoading(true); setMessage(null);
    try {
      const response = await fetch('http://localhost:8000/admin/ingest/hansard', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) { const data = await response.json(); setMessage({ type: 'success', text: `Hansard Ingestion triggered: ${data.summary?.total_processed || 0} processed.` }); }
      else setMessage({ type: 'error', text: 'Failed to trigger Hansard ingestion.' });
    } catch { setMessage({ type: 'error', text: 'Error connecting to server.' }); } finally { setLoading(false); }
  };

  const triggerBillIngest = async () => {
    setLoading(true); setMessage(null);
    try {
      const response = await fetch('http://localhost:8000/ingest/crawl/bills?limit=10', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) { const data = await response.json(); setMessage({ type: 'success', text: `Bill Ingestion triggered: ${data.ingested?.length || 0} new bills found.` }); }
      else setMessage({ type: 'error', text: 'Failed to trigger Bill ingestion.' });
    } catch { setMessage({ type: 'error', text: 'Error connecting to server.' }); } finally { setLoading(false); }
  };

  const markNotificationRead = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8000/admin/notifications/${id}/read`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } });
      if (response.ok) setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'notifications') fetchNotifications();
    if (activeTab === 'audits') fetchAuditLogs();
  }, [activeTab]);

  return (
    <div className="admin-container p-8">
      {/* ── Tabs ── */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { id: 'health', label: 'Health Monitor', icon: <Server size={16} /> },
          { id: 'system', label: 'Data Pipeline', icon: <Activity size={16} /> },
          { id: 'logs', label: 'Audit Logs', icon: <FileText size={16} /> },
          { id: 'audits', label: 'Action Audits', icon: <BookOpen size={16} /> },
          { id: 'notifications', label: 'Notifications', icon: <AlertCircle size={16} /> },
        ].map(tab => (
          <button key={tab.id}
            className={`px-4 py-2 rounded-lg font-semibold border transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.icon} {tab.label}
            {tab.id === 'notifications' && notifications.some(n => !n.is_read) && <span className="w-2 h-2 rounded-full bg-red-500 inline-block ml-1" />}
          </button>
        ))}
      </div>

      <div className="admin-content">

        {/* ══ HEALTH MONITOR TAB ══ */}
        {activeTab === 'health' && (
          <div className="admin-section">
            <div className="section-header" style={{ marginBottom: '1.5rem' }}>
              <h2>System Health Monitor</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Auto-refreshes every 10s</span>
                <button className="refresh-btn" onClick={fetchHealth} title="Refresh now"><RefreshCw size={14} className={healthLoading ? 'spin' : ''} /></button>
              </div>
            </div>

            {healthError && (
              <div style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> Could not reach the health endpoint. Backend may be restarting.
              </div>
            )}

            {health && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

                {/* CPU Card */}
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                    <Cpu size={20} color="#6366f1" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Processor</h3>
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#6b7280' }}>{health.cpu.core_count} logical core{health.cpu.core_count !== 1 ? 's' : ''}</span>
                  </div>
                  <GaugeBar label="CPU Usage" value={health.cpu.percent} />
                  <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.5rem' }}>System uptime: <strong style={{ color: '#374151' }}>{formatUptime(health.uptime_seconds)}</strong></div>
                </div>

                {/* RAM Card */}
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                    <Server size={20} color="#8b5cf6" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Memory (RAM)</h3>
                  </div>
                  <GaugeBar
                    label="RAM Usage"
                    value={health.ram.percent}
                    subLabel={`${health.ram.used_gb} / ${health.ram.total_gb} GB`}
                  />
                </div>

                {/* Disk Card */}
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                    <HardDrive size={20} color="#0ea5e9" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Storage (Disk)</h3>
                  </div>
                  <GaugeBar
                    label="Disk Usage"
                    value={health.disk.percent}
                    subLabel={`${health.disk.used_gb} / ${health.disk.total_gb} GB`}
                  />
                </div>

                {/* Database Card */}
                <div style={{ background: 'white', borderRadius: '12px', border: `1px solid ${health.database.ok ? '#e5e7eb' : '#fecaca'}`, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                    <Database size={20} color={health.database.ok ? '#059669' : '#dc2626'} />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>PostgreSQL</h3>
                    <span style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700,
                      background: health.database.ok ? '#dcfce7' : '#fee2e2',
                      color: health.database.ok ? '#16a34a' : '#dc2626' }}>
                      {health.database.ok ? '● ONLINE' : '✕ OFFLINE'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                    {[
                      { label: 'Latency', value: `${health.database.latency_ms} ms` },
                      { label: 'Pool Size', value: health.database.pool.size },
                      { label: 'Checked In', value: health.database.pool.checkedin },
                      { label: 'Checked Out', value: health.database.pool.checkedout },
                    ].map(item => (
                      <div key={item.label} style={{ background: '#f9fafb', borderRadius: '8px', padding: '8px 12px' }}>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{item.label}</div>
                        <div style={{ fontWeight: 700, color: '#111827', marginTop: '2px' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {!health && !healthLoading && !healthError && (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af' }}>Loading metrics…</div>
            )}
          </div>
        )}

        {/* ══ DATA PIPELINE TAB ══ */}
        {activeTab === 'system' && (
          <div className="admin-section">
            <div className="section-header"><h2>Ingestion &amp; AI Processing</h2></div>
            {loading && activeTab === 'system' && <div className="admin-loading">Processing Request...</div>}
            <div className="system-grid">
              <div className="system-card bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg font-bold mb-2">Hansard Ingestion</h3>
                <p className="text-gray-600 mb-4 text-sm">Crawl parliament.go.ke for the latest transcripts and split into speaker segments.</p>
                <button className="trigger-btn flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50"
                  onClick={triggerIngest} disabled={loading}>
                  <RefreshCw className={loading ? 'spin' : ''} size={16} /> Trigger Full Hansard Sync
                </button>
              </div>
              <div className="system-card bg-white p-6 rounded-xl border border-gray-200">
                <h3 className="text-lg font-bold mb-2">2026 Bill Ingestion</h3>
                <p className="text-gray-600 mb-4 text-sm">Crawl parliament.go.ke for 2026 Bills and generate AI impact summaries (includes OCR).</p>
                <button className="trigger-btn flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  onClick={triggerBillIngest} disabled={loading}>
                  <RefreshCw className={loading ? 'spin' : ''} size={16} /> Trigger 2026 Bill Sync
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

        {/* ══ AUDIT LOGS TAB ══ */}
        {activeTab === 'logs' && (
          <div className="admin-section">
            <div className="section-header"><h2>System Audit Logs</h2><button className="refresh-btn" onClick={fetchLogs}><RefreshCw size={14} /></button></div>
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
              <input type="text" placeholder="Filter log lines (e.g. ERROR, WARNING, /admin…)" value={logSearch} onChange={e => setLogSearch(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.85rem', fontFamily: 'monospace', outline: 'none' }} />
              {logSearch && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#6b7280' }}>{filteredLogLines.split('\n').filter(Boolean).length} lines</span>}
            </div>
            <div className="logs-viewer bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto h-[500px] overflow-y-auto font-mono text-sm leading-relaxed border border-gray-800">
              <pre>{filteredLogLines || 'Initializing logs...'}</pre>
            </div>
          </div>
        )}

        {/* ══ ACTION AUDITS TAB ══ */}
        {activeTab === 'audits' && (
          <div className="admin-section">
            <div className="section-header"><h2>Admin Action Ledger</h2><button className="refresh-btn" onClick={fetchAuditLogs}><RefreshCw size={14} /></button></div>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
              <input type="text" placeholder="Filter by action or details…" value={auditSearch} onChange={e => setAuditSearch(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px 8px 36px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.85rem', outline: 'none' }} />
            </div>
            {loading ? <div className="admin-loading">Loading ledger…</div> : filteredAudits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: '#9ca3af', background: '#f9fafb', borderRadius: '12px', border: '1px dashed #e5e7eb' }}>No admin actions recorded yet.</div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead><tr><th>#</th><th>Action</th><th>Details</th><th>Target ID</th><th>Timestamp</th></tr></thead>
                  <tbody>
                    {filteredAudits.map(log => (
                      <tr key={log.id}>
                        <td style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{log.id}</td>
                        <td>
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em',
                            background: `${ACTION_COLORS[log.action] || '#6b7280'}22`, color: ACTION_COLORS[log.action] || '#6b7280', border: `1px solid ${ACTION_COLORS[log.action] || '#6b7280'}44` }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: '#374151', maxWidth: '320px' }}>{log.details || '—'}</td>
                        <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>{log.target_user_id ?? '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ NOTIFICATIONS TAB ══ */}
        {activeTab === 'notifications' && (
          <div className="admin-section">
            <div className="section-header"><h2>System Notifications</h2><button className="refresh-btn" onClick={fetchNotifications}><RefreshCw size={14} /></button></div>
            <div className="notifications-list flex flex-col gap-3">
              {notifications.length === 0 ? (
                <div className="no-notifications p-8 text-center text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">No notifications found. System is healthy.</div>
              ) : notifications.map(n => (
                <div key={n.id} className={`notification-item p-4 rounded-lg border-l-4 flex flex-col gap-2 ${n.severity === 'High' ? 'bg-red-50 border-red-500' : n.severity === 'Medium' ? 'bg-yellow-50 border-yellow-500' : 'bg-blue-50 border-blue-500'} ${n.is_read ? 'opacity-70 bg-gray-50 border-gray-300' : ''}`}>
                  <div className="notif-header flex justify-between items-center">
                    <span className="notif-type font-bold text-sm tracking-wider uppercase text-gray-700">{n.type}</span>
                    <span className="notif-time text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <div className="notif-body">
                    <p className="text-gray-800 text-sm mb-2">{n.message}</p>
                    {!n.is_read && <button className="mark-read-btn text-xs font-semibold text-blue-600 hover:text-blue-800 underline" onClick={() => markNotificationRead(n.id)}>Mark as Read</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
