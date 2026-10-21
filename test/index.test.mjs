import test from 'node:test';
import assert from 'node:assert/strict';

const { measureLatency, measureRegions } = await import('../index.js');

const MS = 8;

test('measureLatency returns best+median from mocked fetch', async () => {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    calls++;
    await new Promise((r) => setTimeout(r, MS + calls)); // increasing RTT
    return new Response('ok', { status: 200 });
  };
  try {
    const res = await measureLatency('https://example.test/ping', { samples: 3, warmup: 1 });
    assert.ok(res, 'expected a result');
    assert.equal(res.samples.length, 3);
    assert.ok(res.best >= MS, `best ${res.best} should exceed simulated RTT`);
    assert.ok(res.best <= res.median);
    assert.ok(res.median <= Math.max(...res.samples));
    assert.equal(calls, 4); // 1 warmup + 3 samples
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('measureLatency returns null when all requests fail', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('network down');
  };
  try {
    const res = await measureLatency('https://example.test/ping', { samples: 2, warmup: 0 });
    assert.equal(res, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('measureLatency appends a cache-buster to the URL', async () => {
  const seen = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    seen.push(String(url));
    return new Response('ok');
  };
  try {
    await measureLatency('https://example.test/ping?x=1', { samples: 1, warmup: 0 });
    assert.match(seen[0], /x=1/);
    assert.match(seen[0], /[?&]_=/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('measureLatency honors AbortSignal', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, { signal } = {}) => {
    if (signal?.aborted) throw new DOMException('aborted', 'AbortError');
    return new Response('ok');
  };
  try {
    const c = new AbortController();
    c.abort();
    const res = await measureLatency('https://example.test/ping', {
      samples: 2,
      warmup: 0,
      signal: c.signal,
    });
    assert.equal(res, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('measureRegions resolves a label->result map and fires onResult', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    await new Promise((r) => setTimeout(r, MS)); // sub-ms results are filtered as invalid
    return new Response('ok');
  };
  try {
    const seen = [];
    const out = await measureRegions(
      {
        DE: 'https://de.example.test/',
        US: 'https://us.example.test/',
      },
      { samples: 1, warmup: 0 },
      (label) => seen.push(label),
    );
    assert.deepEqual(Object.keys(out).sort(), ['DE', 'US']);
    assert.deepEqual(seen.sort(), ['DE', 'US']);
    assert.ok(out.DE.best >= 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
