'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface LookupPatient {
    id: string;
    input_name_first: string | null;
    input_name_last: string;
    input_dob: string | null;
    input_address_city: string | null;
    input_address_state: string | null;
    input_date_of_service: string | null;
    input_mrn: string | null;
    status: string;
    match_confidence: number | null;
    match_details: Record<string, unknown> | null;
    error_message: string | null;
    matched_patient: {
        id: string;
        patient_fhir_id: string;
        mrn: string | null;
        name_full: string;
        gender: string | null;
        birth_date: string | null;
        address_city: string | null;
        address_state: string | null;
    } | null;
}

interface LookupRequestDetail {
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

export default function LookupDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [lookupRequest, setLookupRequest] = useState<LookupRequestDetail | null>(null);
    const [patients, setPatients] = useState<LookupPatient[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            const response = await fetch(`/api/lookup/${id}`);
            const data = await response.json();
            setLookupRequest(data.lookup_request);
            setPatients(data.patients || []);
        } catch (error) {
            console.error('Failed to fetch lookup:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async () => {
        setProcessing(true);
        try {
            const response = await fetch('/api/lookup/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lookup_request_id: id }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Processing failed');
            }

            await fetchData();
        } catch (error) {
            console.error('Process error:', error);
            alert(error instanceof Error ? error.message : 'Processing failed');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-500/20 text-yellow-400',
            searching: 'bg-blue-500/20 text-blue-400',
            matched: 'bg-green-500/20 text-green-400',
            not_found: 'bg-red-500/20 text-red-400',
            multiple_matches: 'bg-orange-500/20 text-orange-400',
            error: 'bg-red-500/20 text-red-400',
        };
        return colors[status] || 'bg-gray-500/20 text-gray-400';
    };

    const filteredPatients = patients.filter((p) => {
        if (filter === 'all') return true;
        return p.status === filter;
    });

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 flex items-center justify-center">
                <div className="text-white text-xl">Loading...</div>
            </div>
        );
    }

    if (!lookupRequest) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
                <div className="max-w-6xl mx-auto text-center text-white">
                    <h1 className="text-2xl mb-4">Lookup not found</h1>
                    <Link href="/lookup" className="text-purple-400 hover:underline">
                        Back to Lookups
                    </Link>
                </div>
            </div>
        );
    }

    const statusCounts = {
        matched: patients.filter(p => p.status === 'matched').length,
        not_found: patients.filter(p => p.status === 'not_found').length,
        multiple_matches: patients.filter(p => p.status === 'multiple_matches').length,
        pending: patients.filter(p => p.status === 'pending').length,
        error: patients.filter(p => p.status === 'error').length,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <Link href="/lookup" className="text-gray-400 hover:text-white mb-2 inline-block">
                            ← Back to Lookups
                        </Link>
                        <h1 className="text-3xl font-bold text-white">{lookupRequest.name}</h1>
                        <p className="text-gray-400">{lookupRequest.hospital_site?.name}</p>
                    </div>
                    {(lookupRequest.status === 'pending' || statusCounts.pending > 0) && (
                        <button
                            onClick={handleProcess}
                            disabled={processing}
                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
                        >
                            {processing ? 'Searching Epic...' : 'Search Epic for Patients'}
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-5 gap-4 mb-8">
                    <button
                        onClick={() => setFilter('all')}
                        className={`bg-white/5 rounded-2xl p-4 border ${filter === 'all' ? 'border-purple-500' : 'border-white/10'}`}
                    >
                        <p className="text-3xl font-bold text-white">{patients.length}</p>
                        <p className="text-gray-400">Total</p>
                    </button>
                    <button
                        onClick={() => setFilter('matched')}
                        className={`bg-white/5 rounded-2xl p-4 border ${filter === 'matched' ? 'border-green-500' : 'border-white/10'}`}
                    >
                        <p className="text-3xl font-bold text-green-400">{statusCounts.matched}</p>
                        <p className="text-gray-400">Matched</p>
                    </button>
                    <button
                        onClick={() => setFilter('not_found')}
                        className={`bg-white/5 rounded-2xl p-4 border ${filter === 'not_found' ? 'border-red-500' : 'border-white/10'}`}
                    >
                        <p className="text-3xl font-bold text-red-400">{statusCounts.not_found}</p>
                        <p className="text-gray-400">Not Found</p>
                    </button>
                    <button
                        onClick={() => setFilter('multiple_matches')}
                        className={`bg-white/5 rounded-2xl p-4 border ${filter === 'multiple_matches' ? 'border-orange-500' : 'border-white/10'}`}
                    >
                        <p className="text-3xl font-bold text-orange-400">{statusCounts.multiple_matches}</p>
                        <p className="text-gray-400">Multiple</p>
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`bg-white/5 rounded-2xl p-4 border ${filter === 'pending' ? 'border-yellow-500' : 'border-white/10'}`}
                    >
                        <p className="text-3xl font-bold text-yellow-400">{statusCounts.pending}</p>
                        <p className="text-gray-400">Pending</p>
                    </button>
                </div>

                {/* Patients Table */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left p-4 text-gray-400 font-medium">Input Name</th>
                                <th className="text-left p-4 text-gray-400 font-medium">DOB</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Location</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Status</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Matched Patient</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">
                                        No patients match the current filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredPatients.map((patient) => (
                                    <tr key={patient.id} className="border-b border-white/5 hover:bg-white/5 transition">
                                        <td className="p-4 text-white">
                                            {patient.input_name_first} {patient.input_name_last}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {patient.input_dob || '-'}
                                        </td>
                                        <td className="p-4 text-gray-300">
                                            {patient.input_address_city ? `${patient.input_address_city}, ${patient.input_address_state}` : '-'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-sm ${getStatusBadge(patient.status)}`}>
                                                {patient.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {patient.matched_patient ? (
                                                <div>
                                                    <p className="text-white">{patient.matched_patient.name_full}</p>
                                                    <p className="text-gray-400 text-sm">
                                                        MRN: {patient.matched_patient.mrn || 'N/A'}
                                                    </p>
                                                </div>
                                            ) : patient.status === 'multiple_matches' ? (
                                                <span className="text-orange-400 text-sm">
                                                    {(patient.match_details as { matches_count?: number })?.matches_count} potential matches
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">-</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {patient.matched_patient && (
                                                <Link
                                                    href={`/patients/${patient.matched_patient.id}`}
                                                    className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition text-sm"
                                                >
                                                    View Records
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
