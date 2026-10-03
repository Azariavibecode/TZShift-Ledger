# Threat model

## Protected properties

- No claimant-controlled URL or digest can become an authoritative tzdb source.
- A caller cannot mutate or re-assess a terminal series.
- Unknown/ambiguous source behavior never grants a positive result.
- The wallet that deployed the contract has no special role.

## Adversarial cases

| Threat | Control | Test/evidence |
|---|---|---|
| unsupported or malicious TZID | fixed TZID→source-file table | invalid-registration no-mutation tests |
| self-authored source | fixed `eggert/tz` origin and tag lookup | source retrieval tests |
| moved/missing tag or unavailable GitHub | exact release file version + source failure remains retryable | unavailable-source test |
| forged digest in model output | compare all returned digests/commit SHAs to fetched bytes | digest-spoof test |
| prompt injection in source data | source is explicitly untrusted data; bounded schema and comparative consensus | adversarial fixture/test TODO before live release |
| replay assessment | terminal state guard | replay no-mutation test |
| unsupported recurrence semantics | bounded RRULE grammar; no consequence claim from unsupported syntax | invalid RRULE test |

## Residual limitations

The first release supports twelve named zones and a deliberately small RRULE subset. Assessment depends on validators correctly interpreting relevant source context; it does not compile tzdb files. Before a production or live-chain claim, add a broader public fixture matrix, run GenVM integration tests, then exercise and record the exact deployed StudioNet address and finalized transactions.
