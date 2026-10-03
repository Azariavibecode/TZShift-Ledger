# Local verification — 2026-10-03

## Contract Direct Mode

Command: `python -m pytest tests -q`

Result: **16 passed**. Covered permissionless registration, bounded input grammar, exact upstream tag/tree/blob retrieval mocks, source unavailable retry, malformed/digest-spoofed consensus output, positive and no-listed-change branches, prompt-injection fixture, terminal replay and no-mutation checks.

`genvm-lint` lint phase: **3 checks passed, no warnings**. Its separate local validation phase returned `E105 No contract class found`; the same installed validator returns E105 for existing runner-0.2.16 contracts that Direct Mode loads successfully. This is recorded as a tool limitation, not represented as a validation pass. Studio/GenVM deployment validation remains required.

## Public source smoke check

Command: `python scripts/check_upstream_sources.py`

Result: **PASS** against `eggert/tz`. All four source files reachable through the supported TZID map (`northamerica`, `europe`, `asia`, and `australasia`) passed tag/commit/tree/blob verification for both releases and remained below the contract's 220,000-byte cap. The table highlights the Winnipeg positive-control source.

| Release | Resolved commit | `northamerica` bytes | SHA-256 |
|---|---|---:|---|
| 2026d | `d633fe7ed3de8e00ce7cac991376a064a1373bb1` | 178,952 | `f9a008b98624f5ccd630341c0c5968809f046854d8319cf3c360ce3277dc4d13` |
| 2026e | `039ef27cc5f062a2055cb67435d6d71adbefd27d` | 183,813 | `c0c5da0dc337444d80709cf9f8d8011719b789df160ce107a5c38c90e73dc54c` |

The checker independently resolves annotated release tags, reads commit/tree metadata, verifies raw size and Git blob SHA-1, and recomputes SHA-256. This is current source-access evidence only; it is not a StudioNet transaction or validator-consensus result.

## Frontend

Command: `npm --prefix frontend run build`

Result: **PASS**. Vite emitted a production bundle. The current dependency bundle produces a non-blocking chunk-size warning; the app remains functional and can be code-split later.

Browser preview: loaded successfully at desktop width with the supplied logo, StudioNet indicator, permissionless wallet control, schedule form, visible deployed contract address, Explorer control, public register and authority-source links.

## StudioNet deployment readback

Configured contract: [`0x69986c4475740EcDd5bBeB2deA4cE72fccE78dd7`](https://explorer-studio.genlayer.com/address/0x69986c4475740EcDd5bBeB2deA4cE72fccE78dd7), chain ID `61999`.

Initial public `get_counts` read on 2026-10-03 returned `{"assessed_count":0,"series_count":0}`. A subsequent two-wallet lifecycle and two adversarial guard calls finalized successfully; canonical counts are now `{"assessed_count":1,"series_count":1}`. See [`studionet-verification.md`](studionet-verification.md) for transaction links and exact post-state.
