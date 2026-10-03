# Architecture

```text
REGISTERED SERIES
  → verify old/new upstream release tag, commit, tree and blob bytes
  → compare exact zone-rule context + release-note context with GenLayer consensus
  → ASSESSED: POTENTIAL_SHIFT | NO_LISTED_CHANGE
     or remain REGISTERED on UNRESOLVED so a permissionless retry is possible
```

The contract stores a schedule's IANA TZID, local start, bounded daily/weekly RRULE, intent and two increasing tzdb release identifiers. The source origin and source-file mapping are fixed in contract code; callers cannot point the assessment at their own repo or provide their own digest. Raw machine-readable rule evidence is obtained from immutable commits identified by upstream release tags; GitHub commit tree blob SHA-1, exact blob length and locally recomputed SHA-256 bind the fetched bytes.

GenLayer consensus evaluates the semantic relevance of the exact-zone source excerpt across the two releases. It returns a small schema, not unconstrained prose. Contract code validates the enum and every returned commit/digest before writing. The deployer is not an owner. Registration, assessment and read methods work for any caller.

## Boundary

The result is a version-pair impact assessment, not an execution-time guarantee, alarm service, proof that a particular device installed a tzdb release, or an independent `zic` compilation. Unclear mapping, missing mention, conflicting evidence, unsupported zone, or source failure cannot produce `POTENTIAL_SHIFT`. A `NO_LISTED_CHANGE` result applies only to the authenticated pair and bounded series as assessed.
