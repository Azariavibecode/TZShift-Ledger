# TZShift Ledger

TZShift Ledger is a permissionless GenLayer dApp for inspecting how an official time-zone database release change may affect a bounded recurring local-time schedule. Any wallet can register and assess a series; the deployer has no privileged role. The UI is a client of the Intelligent Contract, not a second source of truth.

The contract pins evidence to the upstream `eggert/tz` repository linked by IANA, exact release tags, commits, Git trees and raw blob hashes. It compares the named zone's machine-readable rule source across two releases. Outcomes are deliberately bounded: `POTENTIAL_SHIFT`, `NO_LISTED_CHANGE`, or `UNRESOLVED`. `NO_LISTED_CHANGE` is not a guarantee about future releases or every downstream tzdb build.

## Build and test

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest tests -q
```

Target contract runner: GenLayer `0.2.16`. The Direct Mode tests call the contract's public entry points and mock canonical GitHub retrieval and the consensus boundary. They are not live Studionet evidence.

Live StudioNet contract: [`0x69986c4475740EcDd5bBeB2deA4cE72fccE78dd7`](https://explorer-studio.genlayer.com/address/0x69986c4475740EcDd5bBeB2deA4cE72fccE78dd7). The finalized two-wallet lifecycle and adversarial guard evidence are recorded in [`verification/studionet-verification.md`](verification/studionet-verification.md); canonical counts are `1 series / 1 assessed`.

Fresh public-source smoke check:

```powershell
python scripts\check_upstream_sources.py
```

## Frontend

```powershell
cd frontend
npm install
Copy-Item ..\.env.example .env.local
npm run dev
```

Wallet connection is permissionless and uses StudioNet chain ID `61999`; only a deployment signer is needed to deploy the contract. The main wallet does not receive any on-chain admin power. Reviewers can connect their own wallets and register/assess their own schedules.

After deploying, run the two-role lifecycle without saving keys to disk:

```powershell
$env:CONTRACT_ADDRESS = "0x..."
'{"walletA":"...","walletB":"..."}' | npm --prefix frontend run verify:studionet
```

Wallet A registers a series; wallet B assesses it. The script also proves terminal replay and invalid-RRULE no-mutation guards. Do not commit `.env` or private keys.

## Evidence sources and limits

- IANA Time Zone Database landing page: https://www.iana.org/time-zones
- IANA source/release links: https://www.iana.org/time-zones/tz-link
- Upstream source repository: https://github.com/eggert/tz
- Recurrence semantics: https://www.rfc-editor.org/rfc/rfc5545.html

The initial contract intentionally supports a small explicit set of TZIDs and daily/weekly RRULE shapes. An assessment is a semantic impact review over authenticated source excerpts; this first version does not claim to run `zic` or independently produce a full transition table. Unavailable, ambiguous, truncated, or inconsistent sources must remain unresolved. See `docs/ARCHITECTURE.md`, `docs/THREAT_MODEL.md`, and `verification/source-manifest.md`.
