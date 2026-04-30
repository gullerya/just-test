/**
 * Typed REST client for the JustTest orchestrator (session + environment
 * lifecycle API exposed by the local server).
 *
 * Consumed from:
 * - local-runner (node) — creates a session and polls its result
 * - browser session-box (browser) — fetches env metadata, posts env result
 * - nodejs session-box (node worker) — fetches env metadata, posts env result
 * - interactive UI (browser) — posts env result on user finalize
 *
 * Uses only the DOM-level `fetch` API so the same file runs in every
 * environment without branching on host.
 */

import { Session } from '../testing/model/session.ts';
import type { EnvironmentMetadata, SessionCreateResponse } from './api-contracts.ts';

export type { EnvironmentMetadata, SessionCreateResponse } from './api-contracts.ts';

//	client-side protocol glue: collapses the 200/204 polling protocol into
//	a discriminated union so callers don't have to know about HTTP status
export type SessionResultPollResponse =
	| { ready: false }
	| { ready: true; result: Session };

export class OrchestratorClient {
	readonly #baseUrl: string;

	constructor(baseUrl: string) {
		if (!baseUrl || typeof baseUrl !== 'string') {
			throw new TypeError(`baseUrl MUST be a non-empty string, got '${baseUrl}'`);
		}
		this.#baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
	}

	get baseUrl(): string {
		return this.#baseUrl;
	}

	async createSession(config: object): Promise<SessionCreateResponse> {
		const response = await fetch(`${this.#baseUrl}/api/v1/sessions`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(config)
		});
		if (response.status !== 201) {
			throw new Error(`failed to create session; status: ${response.status}, message: ${response.statusText}`);
		}
		return await response.json();
	}

	async pollSessionResult(sessionId: string): Promise<SessionResultPollResponse> {
		if (!sessionId || typeof sessionId !== 'string') {
			throw new TypeError(`sessionId MUST be a non-empty string, got '${sessionId}'`);
		}
		const response = await fetch(`${this.#baseUrl}/api/v1/sessions/${sessionId}/result`);
		if (response.status === 200) {
			return { ready: true, result: await response.json() };
		}
		if (response.status === 204) {
			return { ready: false };
		}
		throw new Error(`failed to obtain session status; status: ${response.status}, message: ${response.statusText}`);
	}

	async getEnvironmentMetadata(sessionId: string, environmentId: string): Promise<EnvironmentMetadata> {
		const response = await fetch(
			`${this.#baseUrl}/api/v1/sessions/${sessionId}/environments/${environmentId}/metadata`
		);
		if (!response.ok) {
			const body = await response.text().catch(() => '');
			const detail = body ? `, message: ${body}` : '';
			throw new Error(`failed to fetch env metadata; status: ${response.status}${detail}`);
		}
		return await response.json();
	}

	async reportEnvironmentResult(sessionId: string, environmentId: string, result: object): Promise<void> {
		const response = await fetch(
			`${this.#baseUrl}/api/v1/sessions/${sessionId}/environments/${environmentId}/result`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(result)
			}
		);
		if (response.status !== 201) {
			throw new Error(`failed to report env result; status: ${response.status}, message: ${response.statusText}`);
		}
	}
}
