import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/lookup/[id] - Get lookup request details with patients
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { data: lookupRequest, error: reqError } = await supabase
            .from('lookup_requests')
            .select(`
        *,
        hospital_site:hospital_sites(id, name)
      `)
            .eq('id', id)
            .single();

        if (reqError || !lookupRequest) {
            return NextResponse.json({ error: 'Lookup request not found' }, { status: 404 });
        }

        // Get patients with their matched records
        const { data: patients, error: patientsError } = await supabase
            .from('lookup_patients')
            .select(`
        *,
        matched_patient:patient_records(
          id,
          patient_fhir_id,
          mrn,
          name_full,
          gender,
          birth_date,
          address_city,
          address_state
        )
      `)
            .eq('lookup_request_id', id)
            .order('created_at', { ascending: true });

        if (patientsError) throw patientsError;

        return NextResponse.json({
            lookup_request: lookupRequest,
            patients: patients || [],
        });
    } catch (error) {
        console.error('Lookup detail error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to get lookup' },
            { status: 500 }
        );
    }
}

// DELETE /api/lookup/[id] - Delete a lookup request
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const { error } = await supabase
            .from('lookup_requests')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Lookup delete error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to delete lookup' },
            { status: 500 }
        );
    }
}
