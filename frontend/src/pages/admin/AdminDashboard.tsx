import { useState, useEffect, useCallback } from 'react';
import { adminGetDashboardStats } from '../../services/adminUserApi';

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        active: 'badge-success', on_hold: 'badge-warning', completed: 'badge-info', archived: 'badge-neutral',
    };
    const labels: Record<string, string> = {
        active: 'Active', on_hold: 'On Hold', completed: 'Completed', archived: 'Archived',
    };
    return <span className={`badge ${map[status] ?? 'badge-neutral'}`}>{labels[status] ?? status}</span>;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            const data = await adminGetDashboardStats();
            setStats(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    if (loading) return (
        <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div className="spinner mb-sm"></div>
            <p>Loading overview stats...</p>
        </div>
    );

    if (error) return (
        <div className="info-box danger">
            <strong>Error:</strong> {error}
            <button onClick={fetchStats} className="btn btn-ghost btn-sm" style={{ marginLeft: 12 }}>Retry</button>
        </div>
    );

    if (!stats) return null;

    if (!stats) return null;

    const today = new Date().toISOString().split('T')[0];

    return (
        <div>
            <div className="page-header">
                <div className="page-header-left">
                    <h2 className="page-title">Admin Dashboard</h2>
                    <p className="page-subtitle">Overview of your projects, users, and drawings</p>
                </div>
            </div>

            {/* ── Stat Cards ── */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                <div className="stat-card accent-blue">
                    <div className="stat-card-label">My Projects</div>
                    <div className="stat-card-value text-primary">{stats.totalProjects}</div>
                    <div className="stat-card-meta">Active & Pending projects</div>
                </div>

                <div className="stat-card accent-green">
                    <div className="stat-card-label">My Users</div>
                    <div className="stat-card-value">{stats.totalUsers}</div>
                    <div className="stat-card-meta">Registered platform users</div>
                </div>
            </div>

            {/* ── Content grid ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {/* My Projects Table */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-header-title">My Projects</span>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {stats.totalProjects} total
                        </span>
                    </div>
                    <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none', borderRadius: 0 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Project Name</th>
                                    <th>Client</th>
                                    <th>Approx. DWGs</th>
                                    <th>Approval %</th>
                                    <th>Fabrication %</th>
                                    <th>Sequence %</th>
                                    <th>Status</th>
                                    <th>Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!stats.recentProjects || stats.recentProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="table-empty">
                                            No projects yet. Create your first project.
                                        </td>
                                    </tr>
                                ) : (
                                    stats.recentProjects.map((p: any) => {
                                        const hasDelayed = (p.sequences || []).some((s: any) => s.status !== 'Completed' && s.deadline && s.deadline < today);
                                        return (
                                            <tr key={p._id || p.id}>
                                                <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{p.name}</td>
                                                <td style={{ color: 'var(--color-text-secondary)' }}>{p.clientName}</td>
                                                <td className="font-mono" style={{ color: 'var(--color-text-muted)' }}>{p.approximateDrawingsCount || 0}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{width: 40, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden'}}>
                                                            <div style={{width: `${p.approvalPercentage || 0}%`, height: '100%', background: 'var(--color-primary)'}} />
                                                        </div>
                                                        <span style={{fontSize: 11, fontWeight: 700}}>{p.approvalPercentage || 0}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{width: 40, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden'}}>
                                                            <div style={{width: `${p.fabricationPercentage || 0}%`, height: '100%', background: 'var(--color-success-mid)'}} />
                                                        </div>
                                                        <span style={{fontSize: 11, fontWeight: 700}}>{p.fabricationPercentage || 0}%</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {(() => {
                                                        const s = p.sequences || [];
                                                        const total = s.length;
                                                        const done = s.filter((seq: any) => seq.status === 'Completed').length;
                                                        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                                                        return (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <div style={{width: 40, height: 4, background: '#e2e8f0', borderRadius: 2, overflow: 'hidden'}}>
                                                                    <div style={{width: `${pct}%`, height: '100%', background: 'var(--accent-violet)'}} />
                                                                </div>
                                                                <span style={{fontSize: 11, fontWeight: 700, color: 'var(--accent-violet)'}}>{pct}%</span>
                                                                {hasDelayed && <span className="badge badge-danger" style={{ fontSize: 9, padding: '1px 5px' }}>DELAYED</span>}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td><StatusBadge status={p.status} /></td>
                                                <td style={{ color: 'var(--color-text-muted)', fontSize: 12.5 }}>
                                                    {new Date(p.updatedAt).toLocaleDateString('en-US', {
                                                        day: '2-digit', month: 'short', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit',
                                                    })}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
