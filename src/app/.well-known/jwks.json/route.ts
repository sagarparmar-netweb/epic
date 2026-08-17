import { NextResponse } from 'next/server';

// JWK representation of your public key
// This is required by Epic for SMART on FHIR backend services
const publicKeyJWK = {
    keys: [
        {
            kty: "RSA",
            n: "mdsLFd9F6kwW3bJaLjB0aospyWCqG6S2zkkSe2GsSUjaXVwzp3W2KcJY7YaGYFdWgDC0WBBDMavuvRpgoG87MUkALXL4oVA-8OQ3AcbYFn2Rg-DSNVZ3YxOnw_FTn_x3HU4XQWk6BYSq98szp_5u5eLMqjmdadsa92KKSSokXyRr_zIu_iASmla6wFXsXz2qZKx6LynNHXwr47YchQOFY53JQoFl-YjrfuJKarezxbtUC7tcuyW6m2E2VVGt-czdKAymrwwL3p0ggflreWgstCs2_c0eN9o1RVSc1o6qrUemYyykt-NSC_qUhYc9ZYHJPkLos_EQC9yhy9ff1oF2hw",
            e: "AQAB",
            alg: "RS384",
            use: "sig",
            kid: "simplrecords-key-2"
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
