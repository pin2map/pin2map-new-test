#!/usr/bin/env python3
"""Build the development Preview from exactly the app-shell source manifest.

Never alter source files, main, caches, or existing project databases.
Leaflet's pinned distributable is vendored by the Pages workflow afterward.
"""
import json
import re
import shutil
import sys
from pathlib import Path, PurePosixPath


def app_shell(source: Path) -> list[str]:
    worker = (source / "sw.js").read_text(encoding="utf-8")
    match = re.search(r"const CORE=(\[[\s\S]*?\]);", worker)
    if not match:
        raise ValueError("Missing canonical service-worker CORE list")
    items = json.loads(match.group(1))
    if not isinstance(items, list) or len(items) != len(set(items)):
        raise ValueError("CORE must contain unique asset paths")
    result = []
    for item in items:
        if item == "./":  # Application scope URL, not a filesystem item.
            continue
        if not isinstance(item, str) or not item.startswith("./"):
            raise ValueError(f"Invalid app-shell asset: {item!r}")
        relative = item[2:]
        parts = PurePosixPath(relative).parts
        if not parts or any(part in (".", "..") for part in parts):
            raise ValueError(f"Unsafe app-shell asset path: {item!r}")
        if not (source / relative).is_file():
            raise ValueError(f"Missing app-shell asset: {relative}")
        result.append(relative)
    if "index.html" not in result or "sw.js" in result:
        # sw.js is separately deployed because service workers cannot cache
        # their own script from inside install. Preserve it explicitly.
        if "index.html" not in result:
            raise ValueError("CORE must contain index.html")
    return result


def verify(source: Path) -> list[str]:
    assets = app_shell(source)
    html = (source / "index.html").read_text(encoding="utf-8")
    script_and_style = set(re.findall(
        r'(?:src|href)="\./([^"?]+)"', html
    ))
    allowed = set(assets)
    missing = script_and_style - allowed
    if missing:
        raise ValueError("HTML asset absent from CORE: " + ", ".join(sorted(missing)))
    required = {"index.html", "app.js", "map-adapter-leaflet.js",
                "styles.css", "manifest.webmanifest"}
    if required - allowed:
        raise ValueError("Missing essential assets: " + ", ".join(sorted(required - allowed)))
    return assets


def build(source: Path, destination: Path) -> None:
    assets = verify(source)
    if destination.exists() and any(destination.iterdir()):
        raise ValueError("Preview target must be a new or empty directory")
    destination.mkdir(parents=True, exist_ok=True)
    for relative in [*assets, "sw.js"]:
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source / relative, target)
    actual = {str(p.relative_to(destination)) for p in destination.rglob("*") if p.is_file()}
    expected = set(assets) | {"sw.js"}
    if actual != expected:
        raise ValueError(f"Unexpected preview files: {sorted(actual - expected)}")
    print(f"Preview source allowlist: {len(expected)} active files, no experiments")


if __name__ == "__main__":
    if len(sys.argv) not in (2, 3):
        raise SystemExit("Usage: preview-bundle.py SOURCE_DIR [EMPTY_PREVIEW_DIR]")
    source = Path(sys.argv[1]).resolve()
    try:
        if len(sys.argv) == 2:
            print(f"Preview manifest validated: {len(verify(source)) + 1} active files")
        else:
            build(source, Path(sys.argv[2]).resolve())
    except (ValueError, OSError) as error:
        raise SystemExit(f"FAIL preview manifest: {error}") from error
