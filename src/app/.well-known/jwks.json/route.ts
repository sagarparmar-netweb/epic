import { NextResponse } from 'next/server';

// JWK representation of your public key
// This is required by Epic for SMART on FHIR backend services
const publicKeyJWK = {
    keys: [
        {
            kty: "RSA",
            n: "00C58WiK50m4GnyAg-Q9VxA9CruHyv_Wj_IBMl1JT5kygrvWY5Jm8XW9wVjh2Yjz3iR4lmsI_xEYN8_UVZNhTAw3rh7z15eTj0-cz6WqM4YBCI6EhOZ0wirdp6mPzAdCVwVJLipGmjCoo083BNl-e8L5GlxDpGK1lT2GLoDmDQ_fCwuC12wkww7OJnQq_SYKzpnO43ML2wQszSbqAAtxYfx7OAfUZCCBlLVMvjA7x4cKHLDgPQqrLjIXHz_P7tEo6DAXc02ep2kkMoOixa9zj5_H5ozgmEpesztgLoRfLx_kxKr0WthwLlbhdkIIlbGUYzQH-biSY7LNdvsJowYP5w",
            e: "AQAB",
            alg: "RS384",
            use: "sig",
            kid: "simplrecords-key-1"
        }
    ]
};

// GET /.well-known/jwks.json - Epic will call this to get your public key
export async function GET() {
    return NextResponse.json(publicKeyJWK, {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
