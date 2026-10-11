"""Check exact fresh pipeline pins against official OSV, with no extra package."""
from __future__ import annotations

import datetime
import hashlib
import importlib.metadata
import json
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "data/runtime"))


def main():
    lock = json.loads((ROOT / "tools/data/dependencies.lock.json").read_text(encoding="utf-8"))
    queries = []
    for entry in lock["packages"]:
        actual = importlib.metadata.version(entry["package"])
        if actual != entry["version"]:
            raise ValueError(f"Installed {entry['package']} version {actual} differs from locked {entry['version']}; install tools/data/requirements.txt with --require-hashes")
        wheel = ROOT / "data/runtime-wheels" / entry["filename"]
        if wheel.is_file() and hashlib.sha256(wheel.read_bytes()).hexdigest() != entry["sha256"]:
            raise ValueError(f"Retained wheel bytes differ from the official locked digest: {entry['filename']}")
        queries.append({"package": {"name": entry["package"], "ecosystem": "PyPI"}, "version": entry["version"]})
    endpoint = "https://api.osv.dev/v1/querybatch"
    request = urllib.request.Request(endpoint, data=json.dumps({"queries": queries}).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=30) as response:
        result = json.load(response)
    if len(result.get("results", [])) != len(queries):
        raise ValueError("OSV did not return one result for every exact dependency pin")
    report = {"checked_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "endpoint": endpoint, "packages": queries, "result": result, "bound": "Known OSV vulnerabilities for these exact PyPI versions; no claim that absence proves package safety"}
    target = ROOT / "data/prepared/dependency-audit.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    if any(item.get("vulns") for item in result["results"]):
        raise ValueError(f"The fresh pipeline dependency audit found published vulnerabilities; inspect {target}")
    print("PASS: installed locked versions and the official OSV exact-version check")


if __name__ == "__main__":
    main()
