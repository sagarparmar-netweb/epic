import * as jose from 'jose';
import { createPrivateKey } from 'crypto';

interface EpicTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

interface EpicOAuthConfig {
    clientId: string;
    privateKey: string; // Can be base64-encoded or raw PEM
    tokenUrl: string;
    fhirBaseUrl: string;
    isBase64?: boolean; // Whether the key is base64 encoded
}

/**
 * Epic SMART on FHIR Backend Service Authentication
 * Uses JWT assertion flow for server-to-server communication
 */
export class EpicOAuth {
    private config: EpicOAuthConfig;
    private accessToken: string | null = null;
    private tokenExpiry: Date | null = null;

    constructor(config: EpicOAuthConfig) {
        this.config = config;
    }

    /**
     * Sanitize and format the private key
     * Handles: escaped newlines, base64 confusion, headers on same line
     */
    private sanitizeKey(key: string, isBase64: boolean): string {
        try {
            let pem = key.trim();

            // 1. Handle Base64
            if (isBase64) {
                try {
                    const decoded = Buffer.from(pem, 'base64').toString('utf-8');
                    // If decoded looks like a PEM, use it.
                    if (decoded.includes('-----BEGIN')) {
                        pem = decoded;
                    }
                } catch (e) {
                    // Not valid base64? Keep original.
                }
            } else if (!pem.includes('-----BEGIN')) {
                // If flagged as NOT base64 but has no headers, it might actually BE base64
                // Let's try decoding it just in case
                try {
                    const decoded = Buffer.from(pem, 'base64').toString('utf-8');
                    if (decoded.includes('-----BEGIN')) {
                        pem = decoded;
                    }
                } catch (e) { }
            }

            // 2. Fix Escaped Newlines (common in DB/Env vars)
            // Replace literal "\n" strings with actual newlines
            pem = pem.replace(/\\n/g, '\n');

            // 3. Ensure Headers are on their own lines
            // Fix: "-----BEGIN RSA PRIVATE KEY-----MII..." -> "-----BEGIN...-----\nMII..."
            pem = pem.replace(/(-----BEGIN [^-]+-----)/g, '$1\n');
            pem = pem.replace(/(-----END [^-]+-----)/g, '\n$1');

            // 4. Remove excessive newlines
            pem = pem.replace(/\n+/g, '\n').trim();

            return pem;
        } catch (error) {
            console.error('Error sanitizing key:', error);
            return key; // Return original if all else fails
        }
    }

    /**
     * Creates a signed JWT assertion for Epic authentication
     */
    private async createJwtAssertion(): Promise<string> {
        // Sanitize the key first
        const privateKeyPem = this.sanitizeKey(
            this.config.privateKey,
            this.config.isBase64 || false
        );

        try {
            // Use Node's crypto to create the key object (more flexible with formats)
            const keyObject = createPrivateKey({
                key: privateKeyPem,
                format: 'pem',
            });

            // Import for jose
            const privateKey = await jose.importPKCS8(
                keyObject.export({ type: 'pkcs8', format: 'pem' }).toString(),
                'RS384'
            );

            // Create the JWT
            const now = Math.floor(Date.now() / 1000);
            const jwt = await new jose.SignJWT({})
                .setProtectedHeader({
                    alg: 'RS384',
                    typ: 'JWT',
                    kid: 'simplrecords-key-1' // Must match JWKS kid
                })
                .setIssuer(this.config.clientId)
                .setSubject(this.config.clientId)
                .setAudience(this.config.tokenUrl)
                .setIssuedAt(now)
                .setExpirationTime(now + 300) // 5 minutes
                .setJti(crypto.randomUUID())
                .sign(privateKey);

            return jwt;

        } catch (error) {
            console.error('Key Import Error. Key start:', privateKeyPem.substring(0, 50));
            throw error;
        }
    }

    /**
     * Get an access token, refreshing if necessary
     */
    async getAccessToken(): Promise<string> {
        // Check if we have a valid cached token
        if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
            return this.accessToken;
        }

        // Create new JWT assertion
        const assertion = await this.createJwtAssertion();

        // Exchange for access token
        const response = await fetch(this.config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'client_credentials',
                client_assertion_type:
                    'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
                client_assertion: assertion,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Epic OAuth error: ${response.status} - ${errorText}`);
        }

        const tokenData: EpicTokenResponse = await response.json();

        // Cache the token
        this.accessToken = tokenData.access_token;
        this.tokenExpiry = new Date(Date.now() + (tokenData.expires_in - 60) * 1000);

        return this.accessToken;
    }

    /**
     * Clear cached tokens
     */
    clearTokens(): void {
        this.accessToken = null;
        this.tokenExpiry = null;
    }
}

/**
 * Create an Epic OAuth instance from environment variables
 */
export function createEpicOAuth(): EpicOAuth {
    return new EpicOAuth({
        clientId: process.env.EPIC_CLIENT_ID!,
        privateKey: process.env.EPIC_PRIVATE_KEY_BASE64!,
        tokenUrl: process.env.EPIC_TOKEN_URL!,
        fhirBaseUrl: process.env.EPIC_FHIR_BASE_URL!,
        isBase64: true, // Environment variable is base64 encoded
    });
}

/**
 * For hospital sites with custom credentials stored in Supabase
 */
export function createEpicOAuthForSite(site: {
    client_id: string;
    private_key: string;
    token_url: string;
    fhir_base_url: string;
}): EpicOAuth {
    return new EpicOAuth({
        clientId: site.client_id,
        privateKey: site.private_key,
        tokenUrl: site.token_url,
        fhirBaseUrl: site.fhir_base_url,
        isBase64: false, // Database stores raw PEM
    });
}
