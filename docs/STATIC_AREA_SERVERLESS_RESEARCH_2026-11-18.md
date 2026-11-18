# Forschungsstufe 5 – SERVERLOS: statischer Polygonindex und gehashte Einzelobjekte (18.11.2026)

## Verbindliche Architekturannahme
Die Nutzerin/der Nutzer möchte **keinen ständig laufenden eigenen Server** betreiben. Daher zunächst vollständig statisches Angebot ohne Datenbankserver: **Vorverarbeitung in einer befristeten GitHub-Actions-Umgebung**, Veröffentlichung als einzelnes JSON-Suchmanifest plus nur bei Bedarf geladene GeoJSON-Einzelobjekte auf einem geeigneten statischen Host.

- Hier im Forschungsversuch: `research/static-area-catalog.cjs` produziert `index.json` (Bounding Boxes, Namen, Gebietskategorien, Provenienz, Quelle, Version, Lizenz, Objekt-URL, SHA-256, Bytezahl) und `objects/<sha256>.geojson`, **ohne Polygonkoordinaten im Index**. Es schützt vor nicht stabilen Quellkennungen, Doppel-IDs, erfundenen Dateipfaden und stillschweigend geänderten Geometriebytes.
- Ein Caching-/Inflight-deduplizierender Client-Lader verifiziert einen BBox-Kandidaten erst nach vollständigem GeoJSON-Abruf über `fetch` und echter Punkt-in-Polygon-Prüfung. `outside_bbox` lädt nichts. SHA-256 des übertragenen GeoJSON ist eine Inhaltsprüfung, kein Kryptosignatur- oder Vertrauensmodell.
- `research/static-area-http-benchmark.cjs` beschafft **drei reale Natural-Earth-Dateien (Public Domain)** und **vier RESOLVE-Dateien (CC BY 4.0)** durch begrenzten read-only Git-Sparse-Checkout; erstellt die temporären statischen Ausgabedateien im Runner und prüft **196 vorab festgelegte Weltpunkte** über eine lokale HTTP-Verbindung gegen eine exhaustive Vollprüfung aller realen Quellpolygone. Es zählt tatsächliche ausgelieferte HTTP-Bytes, Index-/Objekt-Requests, Kalt-/Warm-Cache und den Geometrieabgleich.
- **Keine Publikation fremder Polygonkoordinaten auf GitHub Pages in dieser Forschungsphase.** Die Ausgabedateien werden nur im Runner temporär erstellt und beim Testende gelöscht. Ein späterer Export benötigt Rechteprüfung, geeignete Plattformgröße, Attribution und Versionierungsstrategie. Die PWA v264 bleibt unangetastet.

## Abgrenzung statische Dateien vs. Server
Die GitHub-Actions-Aufbereitung ist ein **kurzer einmaliger/periodischer Build-Prozess**, kein 24×7-Datenbankserver. Die Bereitstellung erfolgt statisch über HTTPS. Ein HTTP-Serverprozess im GitHub-Runner dient **ausschließlich als lokale Testattrappe für eine statische Dateiauslieferung**; keinerlei Endpunkt berechnet beim Abruf Trefferlisten. Der Browser benötigt ausschließlich `index.json` und einzelne Objektdownloads. Für ein globales PBF/GeoParquet wäre zunächst eine länder-/regionenweise Zerlegung nötig, weil riesige Manifeste nicht vollständig beim App-Start geladen werden sollen. Später möglich: regionale/gekachelte JSON-Manifeste, Geometrie-Simplifizierung mit Qualitätsgrenzen, komprimierte Assets, ETag/immutable URLs und Quellenrevision je Build.

## Vergleich aktuelle Dienst-Alternativen (Dokumentationsstand 18.11.2026)
| Kandidat | Tatsächlich dokumentierte Fähigkeit | Risiko/Lücke | Status |
|---|---|---|---|
| **HERE Map Attributes v8** | `CARTO_POLY_DO*` (kartografische Polygone), `ADMIN_POLY_*`; Anfragen via BBox bzw. Korridor | Geometrien können nach Kachelgrenzen geteilt sein. Nicht garantiert: alle 15 OSM-Spezialflächen, Original-OSM-IDs oder Weiterverarbeitungs-/Langzeitcache-Rechte | Dokumentation geprüft, **kein authentifizierter Zugriff** |
| **Geoapify Boundaries / Place Details** | GeoJSON-Flächen für unterstützte administrative Grenzen und per ID/OSM-ID abgerufene bekannte Objekte | `part-of` beantwortet primär hierarchische Grenzen; nicht belegt für 15 weltweite Seen/Sperrgebiete | Dokumentation geprüft, **kein API-Key-Test** |
| **Geofabrik OSM-PBF / eingeschränkte Shapefiles** | regelmäßig aktualisierte OSM-Regionsextrakte, tägliche Diffs | PBF ist kein fertiger klickbarer Index; freies Shapefile enthält nicht alle Tags, Relationsgeometrien oder Spezialflächen | Material für späteren selektiven Off-Line-Import |
| **Overture GeoParquet** | globaler read-only S3/Azure-Datenbestand, selektiver DuckDB-BBox-Abruf | kein direktes flächendeckendes Lookup beliebiger OSM-Spezialrelationen; kein reiner Browser-Live-Endpunkt | Kandidat für periodischen Offline-Build |
| **GitHub Pages** | bestehende statische Preview-Infrastruktur; kann Index und einzelne Objekte per HTTPS ausliefern | empfohlene Repo-Grenze 1 GB, Site-Bandbreite ~100 GB/Monat *soft*; keine Garantie für großen weltweiten Host. Nicht für primär kommerzielle SaaS-Zwecke | Plausibel für Pilot, nicht globale Kapazität bewiesen |
| **Cloudflare Pages** | alternatives statisches Hosting | einzelnes Asset max. 25 MiB laut Dokumentation; Anzahl/Build-Bedingungen separat prüfen | reine Hosting-Alternative, kein Polygonanbieter |

Referenzen:
- https://docs.here.com/map-attributes/docs/maps-and-layers
- https://docs.here.com/map-attributes/reference/map-attributes-api-v8getmapattributes
- https://apidocs.geoapify.com/docs/boundaries/
- https://apidocs.geoapify.com/docs/place-details/
- https://download.geofabrik.de/technical.html
- https://docs.overturemaps.org/getting-data/cloud-sources/
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- https://developers.cloudflare.com/pages/platform/limits/
- https://www.openstreetmap.org/copyright

**Nicht gemessen:** echte HERE-/Geoapify-Antworten, Provider-Preise für konkrete Tarifstufe, CORS im echten Safari, Antwortzeit über öffentliches Internet, weltweite Abdeckung und langfristige ODbL-Konformität kombinierter Kataloge. Die Ausgangsdaten enthalten weiterhin nur 266 allgemeine Polygone, die im vorherigen ursprünglichen 15-Punkte-Audit **0/15** der speziellen Fachtypen trafen. Der Erfolg des statischen Auslieferungsprinzips darf nicht als Verbesserung dieser Abdeckung ausgegeben werden.

## Nächste Entscheidung
Erst nach einem echten statischen HTTP-Prototyp mit korrekter Lazy-Geomtry, gemessenen Requestzahlen und bestehenden CI-Gates: prüfen, ob ein **kleiner, regionaler OSM-Extrakt** in einem einmaligen Actions-Job extrahiert werden kann, OSM-Ways/Relations korrekt zu Polygone zusammensetzt, und ohne laufenden Server regionalen Index/GeoJSON auf ein **isoliertes, lizenzkonformes statisches Testverzeichnis** ausliefert. Realen HERE-/Geoapify-Vergleich getrennt nach Besitz/Einrichtung von Schlüsseln; keine Schlüssel im Client oder öffentlichen Workflow veröffentlichen.
