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

## Extended failure and conflict audit

All guard transactions finalized with `MAJORITY_AGREE`. The first four calls left the baseline exactly at `1 series / 1 assessed`.

| Scenario | Actor | Transaction | Verified invariant |
|---|---|---|---|
| Unsupported TZID | wallet A | [`0xdabb3939ed12cde16420a9afd6fb7ad5734bfdb08d543be1e94bdf077d61f3c4`](https://explorer-studio.genlayer.com/transactions/0xdabb3939ed12cde16420a9afd6fb7ad5734bfdb08d543be1e94bdf077d61f3c4) | No series or assessment added |
| Invalid intent | wallet B | [`0x9c67442d45c777d7ce754a2b862e8ae128ee8b07b6bb28d3bc5ecaa1a954a6a0`](https://explorer-studio.genlayer.com/transactions/0x9c67442d45c777d7ce754a2b862e8ae128ee8b07b6bb28d3bc5ecaa1a954a6a0) | No series or assessment added |
| Reversed release order | wallet A | [`0x4f877936f64bac6fee3c6531a550ba22aa8b3d0227608f2133c2a047a1b82eca`](https://explorer-studio.genlayer.com/transactions/0x4f877936f64bac6fee3c6531a550ba22aa8b3d0227608f2133c2a047a1b82eca) | No series or assessment added |
| Missing series assessment | wallet B | [`0xe301479a78f4edcbfc3361f3cf193811455ff4f37d08e847c506c9df0e6e3cc0`](https://explorer-studio.genlayer.com/transactions/0xe301479a78f4edcbfc3361f3cf193811455ff4f37d08e847c506c9df0e6e3cc0) | No series or assessment added |
| Register conflict target | wallet A | [`0x031c252e345d44fb36184bbff0ce5f431732ce30e55a614a2cc3047cdaef096e`](https://explorer-studio.genlayer.com/transactions/0x031c252e345d44fb36184bbff0ce5f431732ce30e55a614a2cc3047cdaef096e) | Series `1` registered |
| First assessment wins | wallet A | [`0xc1f5f9e86b351227b7236330d2d8572b640a0315bbb03fa335d8bd3ef3108f12`](https://explorer-studio.genlayer.com/transactions/0xc1f5f9e86b351227b7236330d2d8572b640a0315bbb03fa335d8bd3ef3108f12) | Series `1` assessed once |
| Competing second assessment | wallet B | [`0x5fa556999457b22e846ebb25d51be775680f808f77848df00333b5ad4460ef13`](https://explorer-studio.genlayer.com/transactions/0x5fa556999457b22e846ebb25d51be775680f808f77848df00333b5ad4460ef13) | Terminal guard preserved wallet A as assessor and did not increment `assessed_count` |

Final canonical readback is `{"assessed_count":2,"series_count":2}`. Series `1` is `ASSESSED / POTENTIAL_SHIFT / RULE_CHANGED_FOR_ZONE`; its assessor remains wallet A after wallet B's competing write.

Failures that require deliberately corrupting the fixed upstream authority or validator output cannot be safely forced against the public network. They are covered deterministically in Direct Mode: upstream `503` fails closed and remains retryable; malformed/digest-spoofed consensus cannot write positive state; outcome/reason conflict remains unresolved; and hostile prompt text cannot replace authenticated commitments.
