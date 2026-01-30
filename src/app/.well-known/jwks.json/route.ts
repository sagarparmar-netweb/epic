import { NextResponse } from 'next/server';

// JWK representation of your public key
// This is required by Epic for SMART on FHIR backend services
const publicKeyJWK = {
    keys: [
        {
            kty: "RSA",
            n: "wc6vPcq24uNi1_P22ZVekqoT6iLrOfvIJ2g0aynmWeZrWGWFOFxtSCMtnl1t50hqLV-KRXCB1p_eHVEuxPqik9kVOl_W6Mn5gG-Mp2vM8haQ-2PZTKjpWy0K9pvB_tH0oF5duHHUZnw3VugGVFTk72sWZBw2u-WpR5uJqPuAYqmSXJTgdQWsZAYBgRFk4iYVgGzvRFaD1sxjjhSYhO59hNe5q3-Qef9O9qcdjWVwI7TBR3G3xk2hdbhaFcWqYBdrm5Oc8jmgRFYtaRT9R3l9sA2YC8TMjG_IvQqOjRr7HQgRPUHcu3sc5hwDD3bSGBxP-61RXQf9fph8oy5jvZKH8Q",
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
