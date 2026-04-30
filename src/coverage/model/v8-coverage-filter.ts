import { minimatch } from 'minimatch';
import { normalizeCoverageUrl } from './url-utils.ts';

/**
 * Pure filter for raw V8 coverage entries. Used on every boundary the
 * coverage data crosses before it reaches the orchestrator:
 * - Node worker side (after `Profiler.takePreciseCoverage`)
 * - Browser env service side (after `page.coverage.stopJSCoverage()`)
 *
 * Contract:
 * - `v8Entries` is the shape V8 itself produces: `{ url, functions[] }`.
 * - `includePatterns` is the `coverage.include` list from the user config
 *   (glob patterns, not expanded paths). Matches are OR'd.
 * - Entries with an empty/missing URL are dropped.
 * - Returns a new array with the same entry shape (no class wrapping).
 *
 * Both entry URLs and patterns are passed through `normalizeCoverageUrl`
 * so matching is stable across the boundaries the data has crossed (e.g.
 * callers normalize URLs to src/x.ts while configs use ./src/** glob).
 *
 * Keeping filtering out of the converter means the converter stays pure
 * V8->jt and can be invoked exactly once, at the core.
 */
export type V8CoverageEntry = {
	url: string;
	functions: any[];
};

export function filterV8Coverage(
	v8Entries: V8CoverageEntry[],
	includePatterns: string[]
): V8CoverageEntry[] {
	if (!Array.isArray(v8Entries)) {
		throw new TypeError(`'v8Entries' MUST be an array; got '${v8Entries}'`);
	}
	if (!Array.isArray(includePatterns)) {
		throw new TypeError(`'includePatterns' MUST be an array; got '${includePatterns}'`);
	}
	if (includePatterns.length === 0) {
		return [];
	}
	const canonicalPatterns = includePatterns.map(normalizeCoverageUrl);
	return v8Entries.filter(entry => {
		if (!entry || typeof entry.url !== 'string' || entry.url.length === 0) {
			return false;
		}
		const canonicalUrl = normalizeCoverageUrl(entry.url);
		for (const pattern of canonicalPatterns) {
			if (minimatch(canonicalUrl, pattern)) {
				return true;
			}
		}
		return false;
	});
}
