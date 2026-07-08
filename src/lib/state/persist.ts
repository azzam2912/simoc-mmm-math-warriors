import { browser } from '$app/environment';

const PREFIX = 'math-warrior:';

export function load<T>(key: string, fallback: T): T {
	if (!browser) return fallback;
	try {
		const raw = localStorage.getItem(PREFIX + key);
		return raw === null ? fallback : (JSON.parse(raw) as T);
	} catch {
		return fallback;
	}
}

export function save(key: string, value: unknown): void {
	if (!browser) return;
	try {
		localStorage.setItem(PREFIX + key, JSON.stringify(value));
	} catch {
		// Storage full or blocked — scores just won't persist.
	}
}
