import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CACHE_TTL_MS, loadSuggestions } from './api';
import { sampleSuggestions } from './sample';

const origin = { lat: 35.6009, lon: -82.554 };
const overpass = {
  elements: [{ type: 'node', id: 1, lat: 35.6, lon: -82.55, tags: { name: 'Museum', tourism: 'museum' } }],
};

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe('loadSuggestions', () => {
  beforeEach(() => vi.stubGlobal('localStorage', memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('fetches once, then serves from cache until the TTL expires', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(overpass)));
    vi.stubGlobal('fetch', fetchMock);
    await loadSuggestions('sight', origin, { now: 1000 });
    const again = await loadSuggestions('sight', origin, { now: 2000 });
    expect(again[0].name).toBe('Museum');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await loadSuggestions('sight', origin, { now: 1000 + CACHE_TTL_MS + 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fails over between mirrors', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('busy', { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(overpass)));
    vi.stubGlobal('fetch', fetchMock);
    const items = await loadSuggestions('food', origin);
    expect(items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses the fallback, then stale cache, when every mirror is down', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('down', { status: 503 })),
    );
    const fallback = sampleSuggestions('outdoors', origin)!;
    expect(await loadSuggestions('outdoors', origin, { fallback })).toBe(fallback);
    await expect(loadSuggestions('outdoors', { lat: 0, lon: 0 })).rejects.toThrow();

    localStorage.setItem('wtp:places:v1:sight:35.601,-82.554', JSON.stringify({ at: 0, items: [{ name: 'Old' }] }));
    const stale = await loadSuggestions('sight', origin, { now: CACHE_TTL_MS * 10 });
    expect(stale[0].name).toBe('Old');
  });

  it('only offers sample places near the sample destination', () => {
    expect(sampleSuggestions('food', origin)?.length).toBeGreaterThan(0);
    expect(sampleSuggestions('food', { lat: 40.7, lon: -74 })).toBeUndefined();
  });
});
