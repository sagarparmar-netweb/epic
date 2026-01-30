'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface HospitalSite {
    id: string;
    name: string;
}

interface LookupRequest {
    id: string;
    name: string;
    status: string;
    total_patients: number;
    matched_patients: number;
    failed_patients: number;
    created_at: string;
    completed_at: string | null;
    hospital_site: { id: string; name: string };
}

interface ParsedPatient {
    name_first?: string;
    name_last: string;
    dob?: string;
    address_line?: string;
    address_city?: string;
    address_state?: string;
    address_zip?: string;
    date_of_service?: string;
    mrn?: string;
    site_name?: string;
}

export default function LookupPage() {
    const [sites, setSites] = useState<HospitalSite[]>([]);
    const [lookups, setLookups] = useState<LookupRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedSite, setSelectedSite] = useState<string>('');
    const [lookupName, setLookupName] = useState('');
    const [csvData, setCsvData] = useState<ParsedPatient[]>([]);
    const [csvError, setCsvError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState<string | null>(null);

    // ... fetch data ...
    const fetchData = useCallback(async () => {
        try {
            const [sitesRes, lookupsRes] = await Promise.all([
                fetch('/api/sites'),
                fetch('/api/lookup'),
            ]);

            const sitesData = await sitesRes.json();
            const lookupsData = await lookupsRes.json();

            setSites(sitesData.sites || []);
            setLookups(lookupsData.lookup_requests || []);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const parseCSV = (text: string) => {
        setCsvError(null);
        const lines = text.trim().split('\n');
        if (lines.length < 2) {
            setCsvError('CSV must have a header row and at least one data row');
            return;
        }

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const requiredHeaders = ['last_name'];
        const hasRequired = requiredHeaders.every(h => headers.includes(h));

        if (!hasRequired) {
            setCsvError('CSV must have at least a "last_name" column. Other columns: first_name, dob, address, city, state, zip, date_of_service, mrn, site_name');
            return;
        }

        const patients: ParsedPatient[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
                row[h] = values[idx] || '';
            });

            if (row.last_name) {
                patients.push({
                    name_last: row.last_name,
                    name_first: row.first_name || undefined,
                    dob: row.dob || row.date_of_birth || row.birthdate || undefined,
                    address_line: row.address || row.address_line || undefined,
                    address_city: row.city || undefined,
                    address_state: row.state || undefined,
                    address_zip: row.zip || row.postal_code || undefined,
                    date_of_service: row.date_of_service || row.service_date || undefined,
                    mrn: row.mrn || row.medical_record_number || undefined,
                    site_name: row.site_name || row.site || row.hospital_site || undefined, // Support multiple header names
                });
            }
        }

        if (patients.length === 0) {
            setCsvError('No valid patient records found in CSV');
            return;
        }

        setCsvData(patients);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            parseCSV(text);
        };
        reader.readAsText(file);
    };

    const handleSubmitLookup = async () => {
        if (!selectedSite || csvData.length === 0) return;

        // Validation for Global Batch
        if (selectedSite === 'GLOBAL_BATCH') {
            const missingSite = csvData.some(p => !p.site_name);
            if (missingSite) {
                if (!confirm("Some records in your CSV are missing 'site_name'. They will fail to match. Continue?")) {
                    return;
                }
            }
        }

        setUploading(true);
        try {
            const response = await fetch('/api/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    site_id: selectedSite === 'GLOBAL_BATCH' ? null : selectedSite,
                    name: lookupName || `Lookup ${new Date().toLocaleDateString()}`,
                    patients: csvData,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to create lookup');
            }

            setShowUploadModal(false);
            setCsvData([]);
            setLookupName('');
            fetchData();
        } catch (error) {
            console.error('Upload error:', error);
            setCsvError(error instanceof Error ? error.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleProcessLookup = async (lookupId: string) => {
        setProcessing(lookupId);
        try {
            const response = await fetch('/api/lookup/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lookup_request_id: lookupId }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Processing failed');
            }

            fetchData();
        } catch (error) {
            console.error('Process error:', error);
            alert(error instanceof Error ? error.message : 'Processing failed');
        } finally {
            setProcessing(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-500/20 text-yellow-400',
            processing: 'bg-blue-500/20 text-blue-400',
            completed: 'bg-green-500/20 text-green-400',
            failed: 'bg-red-500/20 text-red-400',
        };
        return colors[status] || 'bg-gray-500/20 text-gray-400';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Patient Lookup</h1>
                        <p className="text-gray-400">Upload patient lists to search and retrieve records</p>
                    </div>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        Upload Patient List
                    </button>
                </div>

                {/* Lookup Requests Table */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left p-4 text-gray-400 font-medium">Name</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Hospital Site</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Progress</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Created</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lookups.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">
                                        No lookup requests yet. Upload a patient list to get started.
                                    </td>
                                </tr>
                            ) : (
                                lookups.map((lookup) => (
                                    <tr key={lookup.id} className="border-b border-white/5 hover:bg-white/5 transition">
                                        <td className="p-4 text-white font-medium">{lookup.name}</td>
                                        <td className="p-4 text-gray-300">{lookup.hospital_site?.name}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(lookup.status)}`}>
                                                {lookup.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            <div className="flex items-center gap-2">
                                                <span className="text-green-400">{lookup.matched_patients}</span>
                                                <span className="text-gray-500">/</span>
                                                <span>{lookup.total_patients}</span>
                                                {lookup.failed_patients > 0 && (
                                                    <span className="text-red-400 text-sm">({lookup.failed_patients} failed)</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-400 text-sm">
                                            {new Date(lookup.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {lookup.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleProcessLookup(lookup.id)}
                                                        disabled={processing === lookup.id}
                                                        className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition disabled:opacity-50"
                                                    >
                                                        {processing === lookup.id ? 'Processing...' : 'Search'}
                                                    </button>
                                                )}
                                                <Link
                                                    href={`/lookup/${lookup.id}`}
                                                    className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition"
                                                >
                                                    View
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-2xl border border-white/10">
                        <h2 className="text-2xl font-bold text-white mb-6">Upload Patient List</h2>

                        <div className="space-y-6">
                            {/* Site Selection */}
                            <div>
                                <label className="block text-gray-400 mb-2">Hospital Site</label>
                                <select
                                    value={selectedSite}
                                    onChange={(e) => setSelectedSite(e.target.value)}
                                    className="w-full bg-slate-700 text-white rounded-xl p-3 border border-white/10"
                                >
                                    <option value="">Select a site...</option>
                                    <option value="GLOBAL_BATCH">🌍 Global Batch (Specify 'site_name' in CSV)</option>
                                    {sites.map((site) => (
                                        <option key={site.id} value={site.id}>{site.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Lookup Name */}
                            <div>
                                <label className="block text-gray-400 mb-2">Lookup Name</label>
                                <input
                                    type="text"
                                    value={lookupName}
                                    onChange={(e) => setLookupName(e.target.value)}
                                    placeholder="e.g., January 2026 Batch"
                                    className="w-full bg-slate-700 text-white rounded-xl p-3 border border-white/10"
                                />
                            </div>

                            {/* CSV Upload */}
                            <div>
                                <label className="block text-gray-400 mb-2">CSV File</label>
                                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        id="csv-upload"
                                    />
                                    <label htmlFor="csv-upload" className="cursor-pointer">
                                        {csvData.length > 0 ? (
                                            <div className="text-green-400">
                                                ✓ {csvData.length} patients parsed
                                            </div>
                                        ) : (
                                            <div className="text-gray-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                </svg>
                                                Click to upload CSV
                                            </div>
                                        )}
                                    </label>
                                </div>
                                {csvError && (
                                    <p className="text-red-400 mt-2 text-sm">{csvError}</p>
                                )}
                                <p className="text-gray-500 text-sm mt-2">
                                    Required: last_name. <br />
                                    Optional: first_name, dob, address, city, state, zip, date_of_service, mrn. <br />
                                    <strong>For Global Batch:</strong> 'site_name' is recommended.
                                </p>
                            </div>

                            {/* Preview */}
                            {csvData.length > 0 && (
                                <div className="bg-slate-900 rounded-xl p-4 max-h-48 overflow-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-gray-400 text-left">
                                                <th className="p-2">Name</th>
                                                <th className="p-2">Site</th>
                                                <th className="p-2">DOB</th>
                                                <th className="p-2">City</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {csvData.slice(0, 5).map((p, i) => (
                                                <tr key={i} className="text-gray-300">
                                                    <td className="p-2">{p.name_first} {p.name_last}</td>
                                                    <td className="p-2">{p.site_name || (selectedSite !== 'GLOBAL_BATCH' ? 'Selected Site' : '-')}</td>
                                                    <td className="p-2">{p.dob || '-'}</td>
                                                    <td className="p-2">{p.address_city || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {csvData.length > 5 && (
                                        <p className="text-gray-500 text-center mt-2">... and {csvData.length - 5} more</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-4 mt-8">
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setCsvData([]);
                                    setCsvError(null);
                                }}
                                className="px-6 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitLookup}
                                disabled={!selectedSite || csvData.length === 0 || uploading}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                            >
                                {uploading ? 'Creating...' : 'Create Lookup'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
