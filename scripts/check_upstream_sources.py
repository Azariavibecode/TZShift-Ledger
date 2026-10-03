"""Read-only smoke check for the exact public tzdb resources used by the contract."""
import hashlib
import json
import sys
import urllib.request

RELEASES = ["2026d", "2026e"]
PATHS = ["northamerica", "europe", "asia", "australasia"]
API = "https://api.github.com/repos/eggert/tz"

def get_json(url):
    request = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "TZShiftLedger-source-check"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)

def get_bytes(url):
    request = urllib.request.Request(url, headers={"User-Agent": "TZShiftLedger-source-check"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()

def blob_sha1(body):
    return hashlib.sha1((f"blob {len(body)}\0").encode() + body).hexdigest()

def check(release):
    ref = get_json(f"{API}/git/ref/tags/{release}")["object"]
    if ref["type"] == "tag":
        ref = get_json(f"{API}/git/tags/{ref['sha']}")["object"]
    if ref["type"] != "commit":
        raise RuntimeError(f"{release}: tag target is not a commit")
    commit = get_json(f"{API}/git/commits/{ref['sha']}")
    tree = get_json(f"{API}/git/trees/{commit['tree']['sha']}?recursive=1")
    if tree.get("truncated") is not False:
        raise RuntimeError(f"{release}: recursive tree is truncated")
    entries = {entry["path"]: entry for entry in tree["tree"]}
    checked = {}
    for path in PATHS:
        body = get_bytes(f"https://raw.githubusercontent.com/eggert/tz/{ref['sha']}/{path}")
        entry = entries[path]
        if entry["sha"] != blob_sha1(body) or entry["size"] != len(body):
            raise RuntimeError(f"{release}/{path}: canonical blob mismatch")
        checked[path] = {"bytes": len(body), "sha256": hashlib.sha256(body).hexdigest()}
    return {"commit": ref["sha"], "files": checked, "release": release}

if __name__ == "__main__":
    try:
        print(json.dumps({"authority": "eggert/tz", "checks": [check(value) for value in RELEASES], "status": "PASS"}, indent=2, sort_keys=True))
    except Exception as exc:
        print(json.dumps({"error": str(exc), "status": "FAIL"}, indent=2), file=sys.stderr)
        raise
