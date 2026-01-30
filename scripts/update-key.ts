// Update the test site with the REAL private key
// Run with: npx tsx update-key.ts

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

// Read real key
const realKey = fs.readFileSync('privatekey.pem', 'utf-8');

const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL!,
    envVars.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateKey() {
    console.log('🔄 Updating Test Site with Real Key...');

    // Find the site with the dummy key
    const { data: sites } = await supabase
        .from('hospital_sites')
        .select('id, name, private_key')
        .eq('private_key', 'test-key-base64'); // Match the dummy one

    if (!sites || sites.length === 0) {
        console.log('✅ No site found with dummy key "test-key-base64".');

        // Fallback: Update the specific seed ID just in case
        const seedId = '776e3896-47aa-4c3e-acfd-f6ec93a2295a';
        console.log(`Checking seed site ${seedId} specifically...`);
        const { error } = await supabase
            .from('hospital_sites')
            .update({ private_key: realKey })
            .eq('id', seedId);

        if (!error) console.log('✅ Updated seed site with real key.');
        else console.log('❌ Error updating:', error.message);

        return;
    }

    const site = sites[0];
    console.log(`Found site: ${site.name} (${site.id})`);

    const { error } = await supabase
        .from('hospital_sites')
        .update({ private_key: realKey })
        .eq('id', site.id);

    if (error) console.log('❌ Update Failed:', error.message);
    else console.log('✅ Key Updated Successfully!');
}

updateKey();
