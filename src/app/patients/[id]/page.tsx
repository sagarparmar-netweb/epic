'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

type TabType = 'overview' | 'coverage' | 'claims' | 'conditions' | 'encounters' | 'procedures' | 'medications' | 'documents';

interface PatientFull {
    id: string;
    patient_fhir_id: string;
    mrn: string | null;
    name_full: string | null;
    name_family: string | null;
    name_given: string | null;
    gender: string | null;
    birth_date: string | null;
    address_line: string | null;
    address_city: string | null;
    address_state: string | null;
    address_postal: string | null;
    phone: string | null;
    email: string | null;
    last_synced_at: string;
    hospital_site: { id: string; name: string; fhir_base_url: string } | null;
    coverage_records: Array<{
        id: string;
        coverage_fhir_id: string;
        status: string | null;
        payer_name: string | null;
        plan_type: string | null;
        member_id: string | null;
        group_number: string | null;
        period_start: string | null;
        period_end: string | null;
    }>;
    claim_records: Array<{
        id: string;
        claim_fhir_id: string;
        claim_type: string | null;
        status: string | null;
        provider_name: string | null;
        service_date: string | null;
        total_amount: number | null;
        diagnoses: unknown;
        procedures: unknown;
    }>;
    condition_records: Array<{
        id: string;
        condition_fhir_id: string;
        clinical_status: string | null;
        code: string | null;
        code_display: string | null;
        onset_date: string | null;
    }>;
    encounter_records: Array<{
        id: string;
        encounter_fhir_id: string;
        status: string | null;
        encounter_class: string | null;
        encounter_type: string | null;
        period_start: string | null;
        period_end: string | null;
        reason: string | null;
        provider_name: string | null;
    }>;
    procedure_records: Array<{
        id: string;
        procedure_fhir_id: string;
        status: string | null;
        code: string | null;
        code_display: string | null;
        performed_date: string | null;
    }>;
    medication_records: Array<{
        id: string;
        medication_fhir_id: string;
        status: string | null;
        medication_name: string | null;
        medication_code: string | null;
        dosage_instruction: string | null;
        authored_on: string | null;
    }>;
    document_records: Array<{
        id: string;
        document_fhir_id: string;
        status: string | null;
        doc_type_display: string | null;
        description: string | null;
        doc_date: string | null;
        content_type: string | null;
    }>;
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const [patient, setPatient] = useState<PatientFull | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    useEffect(() => {
        fetchPatient();
    }, [resolvedParams.id]);

    async function fetchPatient() {
        try {
            const res = await fetch(`/api/patients/${resolvedParams.id}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setPatient(data.patient);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load patient');
        } finally {
            setLoading(false);
        }
    }

    function calculateAge(birthDate: string): number {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    }

    const tabs: { key: TabType; label: string; count?: number }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'coverage', label: 'Coverage', count: patient?.coverage_records?.length },
        { key: 'claims', label: 'Claims', count: patient?.claim_records?.length },
        { key: 'conditions', label: 'Conditions', count: patient?.condition_records?.length },
        { key: 'encounters', label: 'Encounters', count: patient?.encounter_records?.length },
        { key: 'procedures', label: 'Procedures', count: patient?.procedure_records?.length },
        { key: 'medications', label: 'Medications', count: patient?.medication_records?.length },
        { key: 'documents', label: 'Documents', count: patient?.document_records?.length },
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
                    <p className="text-white/60 mb-4">{error || 'Patient not found'}</p>
                    <Link href="/patients" className="text-purple-400 hover:text-purple-300">
                        ← Back to Patients
                    </Link>
                </div>
            </div>
        );
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
                            <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/patients" className="px-4 py-2 text-sm font-medium text-white transition-colors">
                                Patients
                            </Link>
                        </div>
                    </div>
                </nav>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8">
                {/* Breadcrumb */}
                <div className="mb-6">
                    <Link href="/patients" className="text-white/60 hover:text-white transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Patients
                    </Link>
                </div>

                {/* Patient Header */}
                <div className="p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-3xl font-bold text-white">
                                {patient.name_full?.charAt(0) || '?'}
                            </span>
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-white mb-2">
                                {patient.name_full || 'Unknown Patient'}
                            </h1>
                            <div className="flex flex-wrap gap-4 text-sm text-white/60">
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                    </svg>
                                    MRN: {patient.mrn || 'N/A'}
                                </span>
                                <span>
                                    {patient.gender?.charAt(0).toUpperCase()}{patient.gender?.slice(1)} •
                                    {patient.birth_date
                                        ? ` ${calculateAge(patient.birth_date)} years old`
                                        : ' Age unknown'}
                                </span>
                                {patient.birth_date && (
                                    <span>DOB: {new Date(patient.birth_date).toLocaleDateString()}</span>
                                )}
                            </div>
                        </div>
                        {patient.hospital_site && (
                            <div className="px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                                <p className="text-xs text-blue-300">Hospital Site</p>
                                <p className="text-sm font-medium text-white">{patient.hospital_site.name}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-white/10 mb-6 overflow-x-auto">
                    <div className="flex gap-1 min-w-max">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.key
                                        ? 'border-purple-500 text-white'
                                        : 'border-transparent text-white/60 hover:text-white'
                                    }`}
                            >
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-white/10">
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    {activeTab === 'overview' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Contact Info */}
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-white/40 uppercase tracking-wide">Address</p>
                                        <p className="text-white">
                                            {patient.address_line || 'N/A'}
                                            {patient.address_city && <><br />{patient.address_city}, {patient.address_state} {patient.address_postal}</>}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/40 uppercase tracking-wide">Phone</p>
                                        <p className="text-white">{patient.phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/40 uppercase tracking-wide">Email</p>
                                        <p className="text-white">{patient.email || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Stats */}
                            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                <h3 className="text-lg font-semibold text-white mb-4">Record Summary</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-2xl font-bold text-white">{patient.coverage_records?.length || 0}</p>
                                        <p className="text-xs text-white/60">Insurance Plans</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-2xl font-bold text-white">{patient.claim_records?.length || 0}</p>
                                        <p className="text-xs text-white/60">Claims</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-2xl font-bold text-white">{patient.condition_records?.length || 0}</p>
                                        <p className="text-xs text-white/60">Conditions</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-white/5">
                                        <p className="text-2xl font-bold text-white">{patient.encounter_records?.length || 0}</p>
                                        <p className="text-xs text-white/60">Encounters</p>
                                    </div>
                                </div>
                                <p className="text-xs text-white/40 mt-4">
                                    Last synced: {new Date(patient.last_synced_at).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'coverage' && (
                        <div className="space-y-4">
                            {patient.coverage_records?.length === 0 ? (
                                <p className="text-white/60 text-center py-8">No coverage records found.</p>
                            ) : (
                                patient.coverage_records?.map((coverage) => (
                                    <div key={coverage.id} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-semibold text-white">{coverage.payer_name || 'Unknown Payer'}</h4>
                                                <p className="text-sm text-white/60">{coverage.plan_type || 'Insurance Plan'}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${coverage.status === 'active'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {coverage.status || 'Unknown'}
                                            </span>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <p className="text-white/40">Member ID</p>
                                                <p className="text-white font-mono">{coverage.member_id || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-white/40">Group Number</p>
                                                <p className="text-white font-mono">{coverage.group_number || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-white/40">Start Date</p>
                                                <p className="text-white">{coverage.period_start ? new Date(coverage.period_start).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-white/40">End Date</p>
                                                <p className="text-white">{coverage.period_end ? new Date(coverage.period_end).toLocaleDateString() : 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'claims' && (
                        <div className="space-y-4">
                            {patient.claim_records?.length === 0 ? (
                                <p className="text-white/60 text-center py-8">No claim records found.</p>
                            ) : (
                                patient.claim_records?.map((claim) => (
                                    <div key={claim.id} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-semibold text-white">{claim.claim_type || 'Claim'}</h4>
                                                <p className="text-sm text-white/60">{claim.provider_name || 'Unknown Provider'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-white">
                                                    {claim.total_amount ? `$${claim.total_amount.toFixed(2)}` : 'N/A'}
                                                </p>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${claim.status === 'active'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : 'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {claim.status || 'Unknown'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-4 text-sm">
                                            <p className="text-white/40">Service Date</p>
                                            <p className="text-white">{claim.service_date ? new Date(claim.service_date).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'conditions' && (
                        <div className="space-y-4">
                            {patient.condition_records?.length === 0 ? (
                                <p className="text-white/60 text-center py-8">No condition records found.</p>
                            ) : (
                                patient.condition_records?.map((condition) => (
                                    <div key={condition.id} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-semibold text-white">{condition.code_display || 'Unknown Condition'}</h4>
                                                {condition.code && (
                                                    <p className="text-sm text-white/60 font-mono">{condition.code}</p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${condition.clinical_status === 'active'
                                                    ? 'bg-red-500/20 text-red-400'
                                                    : 'bg-green-500/20 text-green-400'
                                                }`}>
                                                {condition.clinical_status || 'Unknown'}
                                            </span>
                                        </div>
                                        {condition.onset_date && (
                                            <p className="mt-2 text-sm text-white/60">
                                                Onset: {new Date(condition.onset_date).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'encounters' && (
                        <div className="space-y-4">
                            {patient.encounter_records?.length === 0 ? (
                                <p className="text-white/60 text-center py-8">No encounter records found.</p>
                            ) : (
                                patient.encounter_records?.map((encounter) => (
                                    <div key={encounter.id} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-semibold text-white">{encounter.encounter_type || encounter.encounter_class || 'Encounter'}</h4>
                                                <p className="text-sm text-white/60">{encounter.provider_name || 'Unknown Provider'}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400`}>
                                                {encounter.status || 'Unknown'}
                                            </span>
                                        </div>
                                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-white/40">Start</p>
                                                <p className="text-white">{encounter.period_start ? new Date(encounter.period_start).toLocaleString() : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-white/40">End</p>
                                                <p className="text-white">{encounter.period_end ? new Date(encounter.period_end).toLocaleString() : 'N/A'}</p>
                                            </div>
                                        </div>
                                        {encounter.reason && (
                                            <div className="mt-3">
                                                <p className="text-white/40 text-sm">Reason</p>
                                                <p className="text-white">{encounter.reason}</p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'procedures' && (
                        <div className="space-y-4">
                            {patient.procedure_records?.length === 0 ? (
                                <p className="text-white/60 text-center py-8">No procedure records found.</p>
                            ) : (
                                patient.procedure_records?.map((procedure) => (
                                    <div key={procedure.id} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-semibold text-white">{procedure.code_display || 'Unknown Procedure'}</h4>
                                                {procedure.code && (
                                                    <p className="text-sm text-white/60 font-mono">{procedure.code}</p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400`}>
                                                {procedure.status || 'Unknown'}
                                            </span>
                                        </div>
                                        {procedure.performed_date && (
                                            <p className="mt-2 text-sm text-white/60">
                                                Performed: {new Date(procedure.performed_date).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'medications' && (
                        <div className="space-y-4">
                            {patient.medication_records?.length === 0 ? (
                                <p className="text-white/60 text-center py-8">No medication records found.</p>
                            ) : (
                                patient.medication_records?.map((medication) => (
                                    <div key={medication.id} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-semibold text-white">{medication.medication_name || 'Unknown Medication'}</h4>
                                                {medication.medication_code && (
                                                    <p className="text-sm text-white/60 font-mono">{medication.medication_code}</p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${medication.status === 'active'
                                                    ? 'bg-green-500/20 text-green-400'
                                                    : 'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {medication.status || 'Unknown'}
                                            </span>
                                        </div>
                                        {medication.dosage_instruction && (
                                            <p className="mt-2 text-sm text-white/60">{medication.dosage_instruction}</p>
                                        )}
                                        {medication.authored_on && (
                                            <p className="mt-2 text-xs text-white/40">
                                                Prescribed: {new Date(medication.authored_on).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-4">
                            {patient.document_records?.length === 0 ? (
                                <p className="text-white/60 text-center py-8">No document records found.</p>
                            ) : (
                                patient.document_records?.map((doc) => (
                                    <div key={doc.id} className="p-6 rounded-2xl bg-white/5 border border-white/10">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-semibold text-white">{doc.doc_type_display || 'Document'}</h4>
                                                {doc.description && (
                                                    <p className="text-sm text-white/60">{doc.description}</p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400`}>
                                                {doc.content_type || 'Unknown type'}
                                            </span>
                                        </div>
                                        {doc.doc_date && (
                                            <p className="mt-2 text-sm text-white/60">
                                                Date: {new Date(doc.doc_date).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
