<div align="center">
  <img src="https://raw.githubusercontent.com/GameHostCloud-Ltd/.github/main/profile/assets/banner.png" alt="GameHostCloud" width="100%"/>

  <br/><br/>

  <img src="https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge" alt="MIT"/>
  <img src="https://img.shields.io/badge/Deps-0-A855F7?style=for-the-badge" alt="Zero dependencies"/>
  <img src="https://img.shields.io/badge/Runtime-Browser-8B5CF6?style=for-the-badge" alt="Browser"/>
</div>

<br/>

# ghc-latency

**Honest latency measurement, straight from the visitor's browser.** The same approach
[GameHostCloud](https://gamehostcloud.com) uses to show real region ping before you buy —
no estimates, no server-side guesses, no marketing numbers.

```js
import { measureLatency, measureRegions } from './index.js';

const r = await measureLatency('https://your-endpoint.example/health');
// → { best: 23.4, median: 27.1, samples: [23.4, 25.0, 27.1, 31.9] }

const regions = await measureRegions({
  helsinki: 'https://fi-hel1.example.com/ping',
  frankfurt: 'https://de-fra1.example.com/ping',
  chicago: 'https://us-chi1.example.com/ping',
});
```

## How it works

- **Cache-busted fetch** against any HTTP(S) endpoint — status code doesn't matter;
  a 404 costs the same transport RTT and is usually the cheapest byte available.
- **Warm-up request(s)** absorb the TLS handshake and HTTP/2 setup (~2-3× RTT) so
  timed samples reflect steady-state transport, not connection setup.
- **Best-of-N sampling** — the minimum of N samples approximates true network RTT,
  filtering out JS scheduling jitter. Median is reported alongside.

## API

| Function | Returns |
|---|---|
| `measureLatency(url, opts?)` | `{best, median, samples[]}` or `null` on total failure |
| `measureRegions(map, opts?, onResult?)` | `{label: result}` — all endpoints measured in parallel |

Options: `samples` (4), `warmup` (1), `timeout` (8000ms), `signal` (AbortSignal).

## Rules of honest measurement

- Pick anchors that answer with *transport* RTT — tiny files, health endpoints,
  404s. Not pages that render.
- Warm-up first if your endpoint does TLS — first connect includes the handshake.
- Cities without a real anchor should be shown as unmeasurable, never guessed.

## Demo

Open `demo/index.html` in a browser (or serve the folder statically) and hit
**Measure now** — it measures three public anchors live from your machine.

## License

MIT — © HHI Solutions Oy ([GameHostCloud](https://gamehostcloud.com))
