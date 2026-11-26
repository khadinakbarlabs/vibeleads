"""Build both installable plugin layouts and a combined SHA256SUMS.txt."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

from package_release import package
from validate_package import ROOT as SKILLS_ROOT

REPO = SKILLS_ROOT.parent
CONNECTOR = REPO / "connector"


def write_connector(output):
    subprocess.run(["node", CONNECTOR / "tests/check-plugin.mjs"], check=True)
    names = [
        ".mcp.json", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json",
        ".codex-plugin/plugin.json", ".cursor-plugin/plugin.json", "LICENSE", "README.md", "TOOL-MAP.md",
    ]
    skill = "skills/vibeleads-core"
    names.extend([f"{skill}/references/seller-methods.json", f"{skill}/references/seller-intake.md",
                  f"{skill}/scripts/seller_plan.py"])
    version = json.loads((CONNECTOR / ".claude-plugin/plugin.json").read_text())["version"]
    for pattern in ("commands/*.md", "skills/*/SKILL.md"):
        names.extend(path.relative_to(CONNECTOR).as_posix() for path in CONNECTOR.glob(pattern))
    files = {}
    for name in sorted(names):
        path = CONNECTOR / name
        if not path.is_file() or path.resolve() != path:
            raise ValueError(f"Invalid connector package file: {name}")
        files[name] = path.read_bytes()
    paths = []
    for layout, prefix in (("root", ""), ("portable", "vibeleads/")):
        path = output / f"vibeleads-{version}-{layout}.zip"
        with zipfile.ZipFile(path, "w") as archive:
            for name, data in files.items():
                entry = zipfile.ZipInfo(prefix + name, (2026, 10, 5, 0, 0, 0))
                entry.external_attr = 0o100644 << 16
                entry.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(entry, data)
        with zipfile.ZipFile(path) as archive:
            if archive.namelist() != [prefix + name for name in files]:
                raise ValueError("Archive file list differs from the connector.")
            if any(archive.read(prefix + name) != data for name, data in files.items()):
                raise ValueError("Archived connector differs from source.")
        paths.append(path)
    return paths


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    output = parser.parse_args().output.resolve()
    if output.is_relative_to(REPO):
        parser.error("Choose an output directory outside this checkout.")
    output.mkdir(parents=True, exist_ok=True)
    if any(output.iterdir()):
        parser.error("Choose an empty output directory.")
    result = package(SKILLS_ROOT, output)
    (output / "archive-report.json").unlink()
    paths = [Path(row["path"]) for row in result["archives"]] + write_connector(output)
    manifest = "".join(f"{hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}\n" for path in sorted(paths))
    (output / "SHA256SUMS.txt").write_text(manifest)
    print(manifest, end="")


if __name__ == "__main__":
    main()
