import React, { useState, useEffect } from 'react';
import { Database, Table as TableIcon, ChevronRight, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './AdminPage.css';

interface TableData {
    table: string;
    columns: string[];
    rows: any[];
}

export const AdminDatabasePage: React.FC = () => {
    const { token } = useAuth();
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTables = async () => {
            setLoading(true);
            try {
                const res = await fetch('http://localhost:8000/admin/db/tables', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setTables(await res.json());
                } else {
                    setError("Failed to fetch tables list.");
                }
            } catch (err) {
                console.error(err);
                setError("Network error fetching tables.");
            } finally {
                setLoading(false);
            }
        };
        fetchTables();
    }, [token]);

    const fetchTableData = async (tableName: string) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`http://localhost:8000/admin/db/table/${tableName}?limit=50`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setTableData(await res.json());
                setSelectedTable(tableName);
            } else {
                setError(`Failed to fetch data for ${tableName}.`);
            }
        } catch (err) {
            console.error(err);
            setError("Network error fetching table data.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-content" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '12px', background: 'var(--primary-subtle)', borderRadius: '12px', color: 'var(--primary)' }}>
                        <Database size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Database Inspector</h1>
                        <p style={{ color: '#666', fontSize: '0.9rem' }}>Real-time view of system tables and records</p>
                    </div>
                </div>

                {error && (
                    <div style={{ padding: '1rem', background: '#fff5f5', color: '#fa5252', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #ffe3e3' }}>
                        {error}
                    </div>
                )}

                {loading && !selectedTable && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#666' }}>
                        <Loader2 className="animate-spin" size={18} />
                        Loading tables...
                    </div>
                )}

                {!selectedTable ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {tables.map(table => (
                            <button 
                                key={table}
                                onClick={() => fetchTableData(table)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '1.25rem',
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                                onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <TableIcon size={20} color="#8E8E93" />
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{table}</span>
                                </div>
                                <ChevronRight size={18} color="#C7C7CC" />
                            </button>
                        ))}
                    </div>
                ) : (
                    <div style={{ background: '#white', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
                        <div style={{ padding: '1rem 1.5rem', background: '#f8f9fa', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <button 
                                onClick={() => setSelectedTable(null)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 600, border: 'none', background: 'none', cursor: 'pointer' }}
                            >
                                <ArrowLeft size={18} /> Back to Tables
                            </button>
                            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#111' }}>{selectedTable}</span>
                            <div style={{ width: '100px' }}></div> {/* Spacer */}
                        </div>

                        <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead style={{ background: '#f1f3f5', position: 'sticky', top: 0 }}>
                                    <tr>
                                        {tableData?.columns.map(col => (
                                            <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#495057', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {tableData?.rows.map((row, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                            {tableData.columns.map(col => (
                                                <td key={col} style={{ padding: '12px 16px', color: '#212529', minWidth: '150px' }}>
                                                    <div style={{ maxHeight: '60px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {tableData?.rows.length === 0 && (
                                        <tr>
                                            <td colSpan={tableData.columns.length} style={{ padding: '3rem', textAlign: 'center', color: '#868e96' }}>
                                                No records found in this table.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
