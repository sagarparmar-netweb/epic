// Test script to debug Epic OAuth
// Run with: npx ts-node --esm test-epic-oauth.ts

import * as jose from 'jose';
import { createPrivateKey } from 'crypto';
import * as fs from 'fs';

const CLIENT_ID = '3534f7d3-b813-4a7c-8e53-ea9b1475e153';
const TOKEN_URL = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token';

async function testEpicOAuth() {
    console.log('🔐 Testing Epic OAuth...\n');

    // Read the private key
    const privateKeyPem = fs.readFileSync('privatekey.pem', 'utf-8');
    console.log('✅ Private key loaded\n');

    // Create key object and export to PKCS8
    const keyObject = createPrivateKey({
        key: privateKeyPem,
        format: 'pem',
    });

    const pkcs8Key = keyObject.export({ type: 'pkcs8', format: 'pem' }).toString();
    const privateKey = await jose.importPKCS8(pkcs8Key, 'RS384');
    console.log('✅ Key imported for jose\n');

    // Create JWT
    const now = Math.floor(Date.now() / 1000);
    const jti = crypto.randomUUID();

    const jwt = await new jose.SignJWT({})
        .setProtectedHeader({
            alg: 'RS384',
            typ: 'JWT',
            kid: 'simplrecords-key-1'
        })
        .setIssuer(CLIENT_ID)
        .setSubject(CLIENT_ID)
        .setAudience(TOKEN_URL)
        .setIssuedAt(now)
        .setExpirationTime(now + 300)
        .setJti(jti)
        .sign(privateKey);

    console.log('📝 JWT Created:\n');
    console.log(jwt);
    console.log('\n');

    // Decode and display for debugging
    const decoded = jose.decodeJwt(jwt);
    console.log('📋 JWT Claims:');
    console.log(JSON.stringify(decoded, null, 2));
    console.log('\n');

    // Make the token request
    console.log('🌐 Making token request to Epic...\n');

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: jwt,
    });

    console.log('Request body:', body.toString());
    console.log('\n');

    try {
        const response = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body,
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

        const responseText = await response.text();
        console.log('\n📥 Response body:');
        console.log(responseText);

        if (response.ok) {
            console.log('\n🎉 SUCCESS! Token obtained.');
        } else {
            console.log('\n❌ Error from Epic. See response above.');
        }
    } catch (error) {
        console.error('❌ Request failed:', error);
    }
}

testEpicOAuth().catch(console.error);
