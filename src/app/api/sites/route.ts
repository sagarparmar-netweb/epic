import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { HospitalSite } from '@/lib/database/types';

// GET /api/sites - List all hospital sites
export async function GET() {
    try {
        const supabase = await createServiceClient();

        const { data, error } = await supabase
            .from('hospital_sites')
            .select('id, name, fhir_base_url, is_active, last_sync_at, created_at')
            .order('name');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ sites: data });
    } catch (error) {
        console.error('Error fetching sites:', error);
        return NextResponse.json(
            { error: 'Failed to fetch hospital sites' },
            { status: 500 }
        );
    }
}

// POST /api/sites - Create a new hospital site
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, fhir_base_url, token_url, client_id, private_key } = body;

        // Validate required fields
        if (!name || !fhir_base_url || !client_id || !private_key) {
            return NextResponse.json(
                { error: 'Missing required fields: name, fhir_base_url, client_id, private_key' },
                { status: 400 }
            );
        }

        const supabase = await createServiceClient();

        const newSite: Partial<HospitalSite> = {
            name,
            fhir_base_url,
            token_url: token_url || 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token',
            client_id,
            private_key, // In production, encrypt this before storing
            is_active: true,
        };

        const { data, error } = await supabase
            .from('hospital_sites')
            .insert(newSite)
            .select('id, name, fhir_base_url, is_active, created_at')
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ site: data }, { status: 201 });
    } catch (error) {
        console.error('Error creating site:', error);
        return NextResponse.json(
            { error: 'Failed to create hospital site' },
            { status: 500 }
        );
    }
}
