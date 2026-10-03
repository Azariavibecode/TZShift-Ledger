# StudioNet end-to-end verification — 2026-10-03

Network: StudioNet (`61999`)

Contract: [`0x69986c4475740EcDd5bBeB2deA4cE72fccE78dd7`](https://explorer-studio.genlayer.com/address/0x69986c4475740EcDd5bBeB2deA4cE72fccE78dd7)

The deployer has no operational privilege. Two auxiliary wallets performed the public lifecycle: wallet A registered series `0`, and wallet B assessed it. Private keys are not stored in this repository.

## Finalized lifecycle

| Step | Actor | Transaction | Final state/effect |
|---|---|---|---|
| Register Winnipeg weekly series | `0x67A1A08Fc4cf7D05c859d0d3D8398a3A30B1677e` | [`0x81a6dbad14f91ea689a736a419e3229fffaa5384add1dfb88f611cd6db7960ca`](https://explorer-studio.genlayer.com/transactions/0x81a6dbad14f91ea689a736a419e3229fffaa5384add1dfb88f611cd6db7960ca) | `FINALIZED`, `MAJORITY_AGREE`; series `0` registered |
| Assess authenticated tzdb sources | `0x7C87B10a3d43F3b3551414401F8b26B9F662bAB5` | [`0xb04b9cf229cca20d3a3568cb1ca75231890022eb9521bd982734bd3402f0fb8e`](https://explorer-studio.genlayer.com/transactions/0xb04b9cf229cca20d3a3568cb1ca75231890022eb9521bd982734bd3402f0fb8e) | `FINALIZED`, `MAJORITY_AGREE`; `POTENTIAL_SHIFT / RULE_CHANGED_FOR_ZONE` |
| Replay terminal assessment | `0x67A1A08Fc4cf7D05c859d0d3D8398a3A30B1677e` | [`0x102f5bf02a2a588da6ed41b213cbebe2c1bff4f6359e47192d8ca744ee500390`](https://explorer-studio.genlayer.com/transactions/0x102f5bf02a2a588da6ed41b213cbebe2c1bff4f6359e47192d8ca744ee500390) | `FINALIZED`, `MAJORITY_AGREE`; rejected by terminal-state guard, counts unchanged |
| Register invalid RRULE | `0x7C87B10a3d43F3b3551414401F8b26B9F662bAB5` | [`0x67852245b4a4c374628451342c4421616cec3432dbd871f8f6cde467fe38c743`](https://explorer-studio.genlayer.com/transactions/0x67852245b4a4c374628451342c4421616cec3432dbd871f8f6cde467fe38c743) | `FINALIZED`, `MAJORITY_AGREE`; rejected by input guard, counts unchanged |

## Canonical post-state

`get_counts()` returned `{"assessed_count":1,"series_count":1}` both before and after the two adversarial guard calls.

`get_series(0)` returned:

- state: `ASSESSED`
- TZID: `America/Winnipeg`
- local start: `2026-10-01T09:30`
- RRULE: `FREQ=WEEKLY;INTERVAL=1;COUNT=6`
- intent: `PRESERVE_LOCAL_TIME`
- outcome: `POTENTIAL_SHIFT`
- reason: `RULE_CHANGED_FOR_ZONE`
- old release/commit: `2026d` / `d633fe7ed3de8e00ce7cac991376a064a1373bb1`
- new release/commit: `2026e` / `039ef27cc5f062a2055cb67435d6d71adbefd27d`
- old `northamerica` SHA-256: `f9a008b98624f5ccd630341c0c5968809f046854d8319cf3c360ce3277dc4d13`
- new `northamerica` SHA-256: `c0c5da0dc337444d80709cf9f8d8011719b789df160ce107a5c38c90e73dc54c`

This demonstrates a fresh happy path, separate public actors, validator-finalized intelligent assessment, terminal replay protection, malformed-input protection, and canonical state reconciliation. Reviewers may repeat registration and assessment with their own wallets; neither test address is privileged.
