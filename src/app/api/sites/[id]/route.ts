import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/sites/[id] - Get a specific hospital site
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createServiceClient();

        const { data, error } = await supabase
            .from('hospital_sites')
            .select('id, name, fhir_base_url, token_url, client_id, is_active, last_sync_at, created_at')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return NextResponse.json({ error: 'Site not found' }, { status: 404 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ site: data });
    } catch (error) {
        console.error('Error fetching site:', error);
        return NextResponse.json(
            { error: 'Failed to fetch hospital site' },
            { status: 500 }
        );
    }
}

// PATCH /api/sites/[id] - Update a hospital site
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const body = await request.json();

        const supabase = await createServiceClient();

        const { data, error } = await supabase
            .from('hospital_sites')
            .update({
                ...body,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select('id, name, fhir_base_url, is_active, last_sync_at, updated_at')
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ site: data });
    } catch (error) {
        console.error('Error updating site:', error);
        return NextResponse.json(
            { error: 'Failed to update hospital site' },
            { status: 500 }
        );
    }
}

// DELETE /api/sites/[id] - Delete a hospital site
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const supabase = await createServiceClient();

        const { error } = await supabase
            .from('hospital_sites')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting site:', error);
        return NextResponse.json(
            { error: 'Failed to delete hospital site' },
            { status: 500 }
        );
    }
}
