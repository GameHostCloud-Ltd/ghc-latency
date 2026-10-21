# Contributing

Thanks for helping make honest latency measurement better.

## Ground rules

- **Measurements must stay honest.** This library exists so hosting providers show players
  *real* round-trip times from their own browser — never estimates, never server-side
  fakes. Any change that would make a reported number less truthful will be rejected.
- Keep it dependency-free. `index.js` must run in browsers and Node 18+ with zero deps.
- Match existing style; keep the file small and readable.

## Developing

```bash
npm test            # node --test test/
node --check index.js
```

The demo page lives in `docs/` and is served by GitHub Pages. Edit
`docs/index.html` to change the live demo.

## Pull requests

Small, focused PRs please. CI must be green (`node --test` on Node 18/20/22).
