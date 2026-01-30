import FHIRClient from 'fhir-kit-client';
import { EpicOAuth, createEpicOAuthForSite } from '../auth/epic-oauth';

export interface HospitalSite {
    id: string;
    name: string;
    fhir_base_url: string;
    client_id: string;
    private_key: string;
    token_url: string;
}

/**
 * Epic FHIR Client wrapper with authentication handling
 */
export class EpicFHIRClient {
    private fhirClient: FHIRClient;
    private oauth: EpicOAuth;
    private baseUrl: string;

    constructor(site: HospitalSite) {
        this.baseUrl = site.fhir_base_url;
        this.oauth = createEpicOAuthForSite({
            client_id: site.client_id,
            private_key: site.private_key,
            token_url: site.token_url,
            fhir_base_url: site.fhir_base_url,
        });

        this.fhirClient = new FHIRClient({
            baseUrl: this.baseUrl,
        });
    }

    /**
     * Get headers with fresh access token
     */
    private async getAuthHeaders(): Promise<Record<string, string>> {
        const token = await this.oauth.getAccessToken();
        return {
            Authorization: `Bearer ${token}`,
            Accept: 'application/fhir+json',
        };
    }

    /**
     * Search for resources with authentication
     */
    async search<T = unknown>(params: {
        resourceType: string;
        searchParams?: Record<string, string>;
    }): Promise<T> {
        const headers = await this.getAuthHeaders();

        return this.fhirClient.search({
            resourceType: params.resourceType,
            searchParams: params.searchParams || {},
            headers,
        }) as Promise<T>;
    }

    /**
     * Read a specific resource by ID
     */
    async read<T = unknown>(params: {
        resourceType: string;
        id: string;
    }): Promise<T> {
        const headers = await this.getAuthHeaders();

        return this.fhirClient.read({
            resourceType: params.resourceType,
            id: params.id,
            headers,
        }) as Promise<T>;
    }

    /**
     * Get all pages of a search result
     */
    async searchAll<T = unknown>(params: {
        resourceType: string;
        searchParams?: Record<string, string>;
    }): Promise<T[]> {
        const headers = await this.getAuthHeaders();
        const results: T[] = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let bundle: any = await this.fhirClient.search({
            resourceType: params.resourceType,
            searchParams: params.searchParams || {},
            headers,
        });

        // Extract entries from first page
        if (bundle.entry) {
            results.push(...bundle.entry.map((e: { resource: T }) => e.resource));
        }

        // Follow next links
        while (bundle.link?.find((l: { relation: string }) => l.relation === 'next')) {
            bundle = await this.fhirClient.nextPage({ bundle });
            if (bundle.entry) {
                results.push(...bundle.entry.map((e: { resource: T }) => e.resource));
            }
        }

        return results;
    }

    /**
     * Get the base URL for this client
     */
    getBaseUrl(): string {
        return this.baseUrl;
    }
}

/**
 * Create a FHIR client for a hospital site
 */
export function createFHIRClient(site: HospitalSite): EpicFHIRClient {
    return new EpicFHIRClient(site);
}
