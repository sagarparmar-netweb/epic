'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface HospitalSite {
    id: string;
    name: string;
    fhir_base_url: string;
    is_active: boolean;
    last_sync_at: string | null;
    created_at: string;
}

interface SiteStats {
    totalPatients: number;
    totalCoverage: number;
    totalClaims: number;
}

export default function DashboardPage() {
    const [sites, setSites] = useState<HospitalSite[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchSites();
    }, []);

    async function fetchSites() {
        try {
            const res = await fetch('/api/sites');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setSites(data.sites || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load sites');
        } finally {
            setLoading(false);
        }
    }

    async function handleSync(siteId: string) {
        setSyncing(siteId);
        setError(null);
        try {
            const res = await fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ site_id: siteId }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            alert(`Sync completed! ${data.patients_synced} patients synced.`);
            fetchSites(); // Refresh sites to update last_sync_at
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sync failed');
        } finally {
            setSyncing(null);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-xl sticky top-0 z-50">
                <nav className="mx-auto max-w-7xl px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link href="/" className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold text-white">Epic Medical Records</span>
                            </Link>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/lookup" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors">
                                Lookup
                            </Link>
                            <Link href="/patients" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors">
                                Patients
                            </Link>
                        </div>
                    </div>
                </nav>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                        <p className="text-white/60 mt-1">Manage hospital sites and sync medical records</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium text-white hover:opacity-90 transition-opacity"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Hospital Site
                    </button>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{sites.length}</p>
                                <p className="text-sm text-white/60">Hospital Sites</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{sites.filter(s => s.is_active).length}</p>
                                <p className="text-sm text-white/60">Active Sites</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">{sites.filter(s => s.last_sync_at).length}</p>
                                <p className="text-sm text-white/60">Synced Sites</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-white">
                                    {sites[0]?.last_sync_at ? new Date(sites[0].last_sync_at).toLocaleDateString() : 'Never'}
                                </p>
                                <p className="text-sm text-white/60">Last Sync</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hospital Sites Grid */}
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">Hospital Sites</h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                    </div>
                ) : sites.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-white/5 border border-white/10">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-white mb-2">No Hospital Sites Configured</h3>
                        <p className="text-white/60 mb-6">Add your first hospital site to start pulling medical records.</p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium text-white"
                        >
                            Add Hospital Site
                        </button>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sites.map((site) => (
                            <div key={site.id} className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{site.name}</h3>
                                            <p className="text-xs text-white/40 truncate max-w-[150px]">{site.fhir_base_url}</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${site.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {site.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>

                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-white/60">Last Sync</span>
                                        <span className="text-white">
                                            {site.last_sync_at
                                                ? new Date(site.last_sync_at).toLocaleString()
                                                : 'Never'
                                            }
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-white/60">Added</span>
                                        <span className="text-white">{new Date(site.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSync(site.id)}
                                        disabled={syncing === site.id}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                                    >
                                        {syncing === site.id ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Syncing...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                Sync Now
                                            </>
                                        )}
                                    </button>
                                    <button className="p-2 border border-white/20 rounded-lg text-white/60 hover:text-white hover:border-white/40 transition-colors">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Add Site Modal */}
            {showAddModal && (
                <AddSiteModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchSites();
                    }}
                />
            )}
        </div>
    );
}

// Add Site Modal Component
function AddSiteModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        fhir_base_url: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
        token_url: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
        client_id: '',
        private_key: '',
    });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/sites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to add site');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-white">Add Hospital Site</h2>
                    <button onClick={onClose} className="text-white/60 hover:text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Site Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                            placeholder="e.g., Memorial Hospital"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">FHIR Base URL</label>
                        <input
                            type="url"
                            required
                            value={formData.fhir_base_url}
                            onChange={(e) => setFormData({ ...formData, fhir_base_url: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                            placeholder="https://fhir.epic.com/..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Token URL</label>
                        <input
                            type="url"
                            required
                            value={formData.token_url}
                            onChange={(e) => setFormData({ ...formData, token_url: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Client ID</label>
                        <input
                            type="text"
                            required
                            value={formData.client_id}
                            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500"
                            placeholder="Your Epic app client ID"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">Private Key (Base64 encoded)</label>
                        <textarea
                            required
                            value={formData.private_key}
                            onChange={(e) => setFormData({ ...formData, private_key: e.target.value })}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-purple-500 h-24 resize-none font-mono text-sm"
                            placeholder="Base64 encoded private key..."
                        />
                        <p className="mt-1 text-xs text-white/40">Encode your PEM private key: base64 -i private_key.pem</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border border-white/20 rounded-lg font-medium text-white hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add Site'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
