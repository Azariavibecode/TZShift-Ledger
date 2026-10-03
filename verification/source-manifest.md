# Source manifest (registered authorities)

| Fact/source | Canonical origin | Binding in contract | What it can establish |
|---|---|---|---|
| tzdb release identity | `https://github.com/eggert/tz` tags, linked from IANA time-zone source documentation | fixed repository and exact annotated version tag resolved to its commit | upstream release snapshot identity, subject to the upstream repository authority |
| versioned zone rules | same exact release commit | exact Git tree path, blob SHA-1/size, recomputed SHA-256 | bytes of the selected zone rule source in that release |
| recurrence convention | RFC 5545 | documentation and restricted input grammar | user-supplied calendar recurrence intent; not an authority for a political zone rule |

The submitter provides only a supported TZID, local schedule and two release labels. The source authority, repository and rule-file mapping are fixed in contract code. No author-supplied test URL or digest is accepted as proof. The public source list and test commands are reproducible inputs, not claims that a live external source fetch or Studionet transaction has already succeeded.
