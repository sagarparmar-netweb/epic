import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET /api/patients - List patients with optional filters
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const siteId = searchParams.get('site_id');
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        const supabase = await createServiceClient();

        let query = supabase
            .from('patient_records')
            .select(`
        *,
        hospital_site:hospital_sites(id, name),
        coverage_records(id, payer_name, member_id, status)
      `, { count: 'exact' });

        // Apply filters
        if (siteId) {
            query = query.eq('hospital_site_id', siteId);
        }

        if (search) {
            query = query.or(`name_full.ilike.%${search}%,mrn.ilike.%${search}%`);
        }

        // Pagination
        query = query
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            patients: data,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching patients:', error);
        return NextResponse.json(
            { error: 'Failed to fetch patients' },
            { status: 500 }
        );
    }
}
