#!/usr/bin/env python3
"""Assemble a self-contained, *not yet deployed* PMTiles offline laboratory.

The imported PMTiles File lives in IndexedDB; the service worker owns only the
same-origin application shell, renderer and map style resources.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path

OUTPUT = Path("output")
VENDOR = OUTPUT / "vendor"
ASSETS = OUTPUT / "assets"

def replace_once(text: str, before: str, after: str) -> str:
    if before not in text:
        raise ValueError(f"Missing rewrite source: {before}")
    return text.replace(before, after)

def main() -> None:
    source_html = Path("pmtiles-persistent-lab-v1.html").read_text()
    source_js = Path("pmtiles-persistent-lab-v1.js").read_text()
    store_js = Path("pmtiles-persistent-store-v1.js").read_text()

    html = source_html
    html = replace_once(html,
        "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.css",
        "./vendor/maplibre-gl.css")
    html = replace_once(html,
        "https://unpkg.com/pmtiles@4.5.0/dist/pmtiles.js",
        "./vendor/pmtiles.js")
    html = replace_once(html,
        "https://unpkg.com/@protomaps/basemaps@5.7.2/dist/basemaps.js",
        "./vendor/basemaps.js")
    html = replace_once(html,
        "./pmtiles-persistent-store-v1.js", "./pmtiles-persistent-store-v1.js")
    html = replace_once(html,
        "./pmtiles-persistent-lab-v1.js", "./pmtiles-persistent-lab-v1.js")
    html = replace_once(html,
        "pin2map · PMTiles-Speicherprobe", "pin2map · Offline-Labor (Paket)")
    html = replace_once(html,
        "Kartenstil, Glyphs, Sprites und Bibliotheken werden noch online geladen.",
        "Kartenstil, Glyphs, Sprites und Bibliotheken liegen in diesem Testpaket lokal. Offline-Funktion noch gesondert testen.")
    html = replace_once(html,
        "<footer>",
        '<div id="offlineReadiness" role="status" '
        'style="position:absolute;z-index:6;left:8px;bottom:66px;'
        'max-width:calc(100% - 16px);background:#fffefa;'
        'border:1px solid #d8e1eb;padding:8px;border-radius:8px;'
        'font-size:11px">Offline-Ressourcen werden vorbereitet …</div>\\n<footer>')
    html = replace_once(html,
        "</body>",
        '<script src="./offline-register.js" defer></script>\n</body>')

    js = replace_once(source_js,
        'https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs',
        './vendor/maplibre-gl.mjs')
    # Explicit worker path avoids browsers deriving a wrong worker URL from
    # the packaged ESM entry point. MapLibre 6.16 uses a standalone worker.
    js = js.replace(
        'const $=id=>document.getElementById(id);',
        'maplibregl.setWorkerUrl(new URL("./vendor/maplibre-gl-worker.mjs", import.meta.url).href);\n'
        'const $=id=>document.getElementById(id);',
        1)
    if 'maplibregl.setWorkerUrl(' not in js:
        raise ValueError("Failed to wire MapLibre local worker URL")
    js = replace_once(js,
        'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
        './assets/fonts/{fontstack}/{range}.pbf')
    js = replace_once(js,
        'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
        './assets/sprites/v4/light')
    js = replace_once(js,
        '" · Kartenstil lädt online"',
        '" · Kartenstil aus lokalem Paket"')
    js = replace_once(js,
        '" (Stilressourcen noch online)"',
        '" (Stilressourcen lokal)"')
    (OUTPUT / "index.html").write_text(html)
    (OUTPUT / "pmtiles-persistent-lab-v1.js").write_text(js)
    (OUTPUT / "pmtiles-persistent-store-v1.js").write_text(store_js)

    # Check presence of complete local renderer and one standard glyph range.
    required = [
        VENDOR / "maplibre-gl.mjs",
        VENDOR / "maplibre-gl-worker.mjs",
        VENDOR / "maplibre-gl.css",
        VENDOR / "pmtiles.js",
        VENDOR / "basemaps.js",
        ASSETS / "sprites/v4/light.json",
        ASSETS / "sprites/v4/light.png",
        ASSETS / "sprites/v4/light@2x.json",
        ASSETS / "sprites/v4/light@2x.png",
        ASSETS / "fonts/Noto Sans Regular/0-255.pbf",
        ASSETS / "fonts/Noto Sans Medium/0-255.pbf"
    ]
    for item in required:
        if not item.is_file() or item.stat().st_size == 0:
            raise SystemExit(f"Missing offline resource: {item}")

    register = """// The worker is allowed only in the isolated offline-lab folder.
const readiness=document.getElementById("offlineReadiness");
function report(text){if(readiness)readiness.textContent=text;}
if ("serviceWorker" in navigator && location.protocol === "https:" &&
    location.pathname.includes("/offline-stuttgart-lab/")) {
  report("Installiere lokale Programm-, Schrift- und Symbolressourcen …");
  navigator.serviceWorker.register("./offline-stuttgart-sw.js",
    {scope:"./", updateViaCache:"none"})
    .then(()=>navigator.serviceWorker.ready)
    .then(async()=>{
      const entries=await caches.keys();
      const names=entries.filter(name=>name.startsWith("pin2map-stuttgart-lab-"));
      if(!names.length)throw Error("Kein vollständiger Ressourcen-Cache gefunden");
      const cache=await caches.open(names[names.length-1]);
      const required=[
        "./index.html","./vendor/maplibre-gl.mjs","./vendor/pmtiles.js",
        "./vendor/basemaps.js","./assets/sprites/v4/light.json",
        "./assets/fonts/Noto Sans Regular/0-255.pbf"
      ];
      for(const item of required){
        if(!await cache.match(new URL(item,location.href)))
          throw Error("Ressource nicht im Cache: "+item);
      }
      report("Programm und Kartenstil lokal verfügbar. Die PMTiles-Region muss separat gespeichert sein. Flugmodus-Test noch offen.");
    })
    .catch(error=>report("Offline-Ressourcen NICHT bereit: "+String(error?.message||error)));
}else{
  report("Offline-Service-Worker nur im separaten HTTPS-Testordner verfügbar.");
}
"""
    (OUTPUT / "offline-register.js").write_text(register)

    # Precache every file in a size-bounded package, never an external URL.
    # The PMTiles archive is deliberately not bundled or cached by this worker.
    existing = sorted(
        p.relative_to(OUTPUT).as_posix()
        for p in OUTPUT.rglob("*")
        if p.is_file() and p.name not in ("offline-stuttgart-sw.js", "manifest.json")
    )
    all_paths = ["./" + p for p in existing]
    # Content-address the SW cache to force safe rotation with each build.
    version_hash = hashlib.sha256()
    for relpath in existing:
        path = OUTPUT / relpath
        version_hash.update(relpath.encode("utf-8"))
        version_hash.update(hashlib.sha256(path.read_bytes()).digest())
    cache_version = "pin2map-stuttgart-lab-" + version_hash.hexdigest()[:16]
    worker = """/* Isolated offline lab shell. No tile interception, no sync. */
const VERSION=""" + json.dumps(cache_version) + """;
const RESOURCES=""" + json.dumps(all_paths, ensure_ascii=False) + """;
self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(VERSION);
    // Atomic install: any missing asset fails installation, never falsely
    // announces an offline-ready package.
    await cache.addAll(RESOURCES);
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith("pin2map-stuttgart-lab-")&&k!==VERSION)
      .map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin || !url.pathname.startsWith(new URL("./",self.location).pathname))
    return;
  event.respondWith((async()=>{
    const cache=await caches.open(VERSION);
    // A directory URL is not identical to ./index.html in Cache Storage.
    // Keep the test application startable from /offline-stuttgart-lab/
    // after it has been installed online at least once.
    if(event.request.mode==="navigate"){
      const document=await cache.match("./index.html");
      if(document)return document;
    }
    const cached=await cache.match(event.request);
    if(cached)return cached;
    // Never synthesize map tiles; the selected archive stays in IndexedDB.
    return fetch(event.request);
  })());
});
"""
    if "https://" in worker:
        raise SystemExit("Service worker has an unexpected external URL")
    (OUTPUT / "offline-stuttgart-sw.js").write_text(worker)

    files = sorted(p for p in OUTPUT.rglob("*") if p.is_file())
    size = sum(p.stat().st_size for p in files)
    if size > 100 * 1024 * 1024:
        raise SystemExit(f"Offline package too large: {size} bytes")
    inventory = {
        p.relative_to(OUTPUT).as_posix(): {
            "bytes":p.stat().st_size,
            "sha256":hashlib.sha256(p.read_bytes()).hexdigest()
        } for p in files
    }
    (OUTPUT / "manifest.json").write_text(json.dumps({
        "status":"packaged-not-deployed-not-device-tested",
        "mapArchiveIncluded":False,
        "tileArchiveExpected":"stuttgart-z12.pmtiles imported by user",
        "libraries":{"maplibre":"6.16.0","pmtiles":"4.5.0","basemaps":"5.7.2"},
        "resources":inventory
    },ensure_ascii=False,indent=2))
    summary = ("## Isolated Stuttgart offline-lab ZIP contents\n\n"
        f"Files: {len(files)}; total {size/1048576:.2f} MiB.\n\n"
        "Includes shell, pinned libraries, glyphs and Light sprites, but NO .pmtiles map file.\n\n"
        "The site must be hosted over HTTPS in an isolated directory; a real airplane-mode test is pending.\n")
    print(summary)
    if "GITHUB_STEP_SUMMARY" in os.environ:
        with open(os.environ["GITHUB_STEP_SUMMARY"],"a") as out:
            out.write(summary)

if __name__=="__main__":
    main()
