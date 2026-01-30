// Verify Schema Changes
// Run with: npx tsx verify-schema.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read env
const envPath = path.join(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL!,
    envVars.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifySchema() {
    console.log('🔍 Verifying Schema Changes...');

    // 1. Check if input_site_name exists in lookup_patients
    // We can't query information_schema directly with supabase-js easily unless we use RPC or raw SQL (which we might not have set up).
    // A hacky way is to try to SELECT the column. If it fails, it doesn't exist.

    const { error: colError } = await supabase
        .from('lookup_patients')
        .select('input_site_name')
        .limit(1);

    if (colError) {
        console.log('❌ Column `input_site_name` MISSING in `lookup_patients`. Error:', colError.message);
    } else {
        console.log('✅ Column `input_site_name` EXISTS.');
    }

    // 2. Check if hospital_site_id is nullable in lookup_requests
    // We can try to inserting a row with NULL hospital_site_id.
    // If it fails with "null constraint", then it's not nullable.

    console.log('Testing nullable hospital_site_id...');
    const { data, error: insertError } = await supabase
        .from('lookup_requests')
        .insert({
            hospital_site_id: null,
            name: 'Schema Verification Test',
            status: 'pending'
        })
        .select()
        .single();

    if (insertError) {
        if (insertError.message.includes('null value in column "hospital_site_id"')) {
            console.log('❌ Column `hospital_site_id` is still NOT NULL.');
        } else {
            console.log('❌ Insert failed for other reason:', insertError.message);
        }
    } else {
        console.log('✅ Column `hospital_site_id` is NULLABLE (Insert succeeded).');
        // Clean up
        await supabase.from('lookup_requests').delete().eq('id', data.id);
        console.log('   (Cleaned up test record)');
    }
}

verifySchema();
