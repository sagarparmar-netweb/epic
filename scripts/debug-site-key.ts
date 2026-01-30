// Debug script to check private key format
// Run with: npx tsx debug-site-key.ts

import { createClient } from '@supabase/supabase-js';
import { createPrivateKey } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Manually read env file
const envPath = path.join(process.cwd(), '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envFile.split('\n').forEach(line => {
    // Basic env parser
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
    }
});

const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL!,
    envVars.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSiteKeys() {
    console.log('🔍 Checking Hospital Site Keys...');

    const { data: sites, error } = await supabase
        .from('hospital_sites')
        .select('id, name, private_key');

    if (error) {
        console.error('❌ Error fetching sites:', error.message);
        return;
    }

    console.log(`Found ${sites.length} sites.\n`);

    for (const site of sites) {
        console.log(`Checking site: "${site.name}"`);
        const key = site.private_key || '';

        console.log(`  Length: ${key.length} chars`);
        console.log(`  First 40 chars: ${key.substring(0, 40).replace(/\n/g, '\\n')}...`);

        // Try to detect format
        let pem = key.trim();
        let isBase64 = false;

        // Check if it's base64
        if (!pem.includes('-----BEGIN')) {
            try {
                const decoded = Buffer.from(pem, 'base64').toString('utf-8');
                if (decoded.includes('-----BEGIN')) {
                    console.log('  Type: Base64 Encoded PEM (Detected)');
                    pem = decoded;
                    isBase64 = true;
                } else {
                    console.log('  Type: Unknown / Raw string (Not PEM headers found)');
                }
            } catch (e) {
                console.log('  Type: Unknown / Invalid Base64');
            }
        } else {
            console.log('  Type: PEM String');
        }

        // Try sanitization (Same logic as deployed)
        try {
            if (isBase64 && !pem.includes('-----BEGIN')) {
                pem = Buffer.from(pem, 'base64').toString('utf-8');
            }
            pem = pem.replace(/\\n/g, '\n');
            pem = pem.replace(/(-----BEGIN [^-]+-----)/g, '$1\n');
            pem = pem.replace(/(-----END [^-]+-----)/g, '\n$1');
            pem = pem.replace(/\n+/g, '\n').trim();
        } catch (e) {
            console.log('  Sanitization failed:', e.message);
        }

        // Try parsing
        try {
            const keyObj = createPrivateKey({ key: pem, format: 'pem' });
            console.log(`  ✅ VALID: Parsed successfully as ${keyObj.type} ${keyObj.asymmetricKeyType}`);
        } catch (e) {
            console.log(`  ❌ INVALID: ${e.message}`);
        }
        console.log('---');
    }
}

checkSiteKeys();
