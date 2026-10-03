from pathlib import Path

ROOT = Path(__file__).parents[1]
SOURCE = (ROOT / "contracts" / "TZShiftLedger.py").read_text(encoding="utf-8")

def test_contract_source_uses_pinned_runner_and_upstream_only():
    assert SOURCE.startswith("# v0.2.16")
    assert "https://api.github.com/repos/eggert/tz" in SOURCE
    assert "https://raw.githubusercontent.com/eggert/tz/" in SOURCE
    assert "gl.eq_principle.prompt_comparative" in SOURCE
    assert "owner" not in SOURCE and "admin" not in SOURCE

def test_contract_bounds_claim_and_is_permissionless():
    assert '"POTENTIAL_SHIFT", "NO_LISTED_CHANGE", "UNRESOLVED"' in SOURCE
    assert "UNRESOLVED" in SOURCE
    assert "def register_series" in SOURCE and "def assess_series" in SOURCE
    assert "creator" in SOURCE
    assert "def _source_file" in SOURCE

def test_provenance_and_replay_guards_are_contract_paths():
    for term in ["_blob_sha1(raw.body)", 'hashlib.sha256(raw.body).hexdigest()',
                 'tree.get("truncated", True)', 'data["state"] != "REGISTERED"',
                 'result.get(name) != value']:
        assert term in SOURCE
