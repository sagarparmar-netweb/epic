// Check and fix Client ID mismatch
// Run with: npx tsx fix-client-id.ts

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read env to get valid Client ID
const envPath = path.join(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
});

const VALID_CLIENT_ID = envVars.EPIC_CLIENT_ID;

console.log(`✅ Using Valid Client ID from Env: ${VALID_CLIENT_ID}`);

const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL!,
    envVars.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixClientId() {
    const { data: sites } = await supabase
        .from('hospital_sites')
        .select('id, name, client_id');

    if (!sites) return;

    for (const site of sites) {
        console.log(`Site: "${site.name}"`);
        console.log(`   Current ID: ${site.client_id}`);

        if (site.client_id !== VALID_CLIENT_ID) {
            console.log(`   ❌ MISMATCH! Updating to ${VALID_CLIENT_ID}...`);

            const { error } = await supabase
                .from('hospital_sites')
                .update({ client_id: VALID_CLIENT_ID })
                .eq('id', site.id);

            if (error) console.log(`   ❌ Update failed: ${error.message}`);
            else console.log(`   ✅ Updated!`);
        } else {
            console.log(`   ✅ Matches.`);
        }
        console.log('---');
    }
}

fixClientId();
