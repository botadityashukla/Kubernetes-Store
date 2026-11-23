import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './index.css';

const API = 'http://localhost:5000';

function App() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);

    const fetchStores = useCallback(async () => {
        try {
            const { data } = await axios.get(`${API}/stores`);
            setStores(data);
            setError(null);
        } catch (err) {
            setError('Backend unreachable — is the API server running on :5000?');
        } finally {
            setLoading(false);
        }
    }, []);

    const createStore = async () => {
        setCreating(true);
        setError(null);
        try {
            const { data } = await axios.post(`${API}/create-store`);
            setStores(prev => [...prev, data.store]);
            setTimeout(fetchStores, 2000);
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        } finally {
            setCreating(false);
        }
    };

    const deleteStore = async (id) => {
        if (!window.confirm(`Delete ${id}?\nThis will remove all Kubernetes resources in this namespace.`)) return;
        try {
            await axios.delete(`${API}/delete-store/${id}`);
            setStores(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            setError(err.response?.data?.error || err.message);
        }
    };

    useEffect(() => {
        fetchStores();
        const t = setInterval(fetchStores, 5000);
        return () => clearInterval(t);
    }, [fetchStores]);

    if (loading) {
        return (
            <div className="shell">
                <div className="loading-wrap">
                    <div className="spinner" />
                    <span>Connecting to cluster...</span>
                </div>
            </div>
        );
    }

    const readyCount = stores.filter(s => s.status === 'Ready').length;

    return (
        <div className="shell">
            <header className="topbar">
                <div className="topbar-left">
                    <h1>Store Dashboard</h1>
                    <p>Kubernetes store orchestration platform</p>
                </div>
                <div className="topbar-right">
                    <button className="btn" onClick={fetchStores}>Refresh</button>
                    <button className="btn btn-primary" onClick={createStore} disabled={creating}>
                        {creating ? <><span className="spinner" /> Provisioning...</> : '+ New store'}
                    </button>
                </div>
            </header>

            {error && (
                <div className="error-bar">
                    <strong>Error</strong>
                    <span>{error}</span>
                </div>
            )}

            {stores.length === 0 ? (
                <div className="empty">
                    <div className="empty-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <h2>No stores running</h2>
                    <p>Provision your first WooCommerce instance. Each store runs in an isolated Kubernetes namespace.</p>
                    <button className="btn btn-primary" onClick={createStore} disabled={creating}>
                        {creating ? 'Provisioning...' : '+ Create first store'}
                    </button>
                </div>
            ) : (
                <>
                    <div className="section-label">
                        {stores.length} store{stores.length !== 1 ? 's' : ''} &middot; {readyCount} active
                    </div>
                    <div className="store-list">
                        {stores.map(store => (
                            <StoreCard key={store.id} store={store} onDelete={deleteStore} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function StoreCard({ store, onDelete }) {
    const status = (store.status || '').toLowerCase();
    const chipClass =
        status === 'ready' ? 'chip-ready' :
            status === 'provisioning' ? 'chip-provisioning' :
                status === 'failed' ? 'chip-failed' : '';

    return (
        <div className="store-card">
            <div className="store-card-top">
                <span className="store-card-id">{store.id}</span>
                <span className={`chip ${chipClass}`}>
                    <span className="chip-dot" />
                    {store.status}
                </span>
            </div>
            <div className="store-card-bottom">
                <div className="store-card-meta">
                    {store.status === 'Ready' ? (
                        <a href={store.url} target="_blank" rel="noopener noreferrer">{store.url}</a>
                    ) : (
                        <span>{store.url}</span>
                    )}
                    <span className="meta-sep" />
                    <span>ns/{store.namespace}</span>
                    <span className="meta-sep" />
                    <span>{timeSince(new Date(store.createdAt))}</span>
                </div>
                <div className="store-card-actions">
                    {store.status === 'Ready' && (
                        <a href={store.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm">
                            Open store
                        </a>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(store.id)}>
                        Delete
                    </button>
                </div>
            </div>
            {store.error && <div className="store-error">{store.error}</div>}
        </div>
    );
}

function timeSince(date) {
    const s = Math.floor((Date.now() - date.getTime()) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
}

export default App;
