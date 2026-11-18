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


## Live-Ergebnis und verifizierte Freigaben

**Forschungs-/Funktionscommit:** `87e44430540372cf1b58f062759c13fe51d3d7e2`.

Der [isolierte Forschungsworkflow 44339464362](https://github.com/pin2map/pin2map-new-test/actions/runs/44339464362) lief **completed/success** mit echten Natural-Earth- und RESOLVE-Quellpolygonen, 6 neuen Testfällen (Hash-/Pfad-/Lizenzprüfung, instabile IDs, Parallel-Cache und tatsächliche Geometrieintegrität) und `fetch`-Abrufen vom temporären lokalen HTTP-Server. Für jede der 196 Koordinaten wurden die vollständig sortierten echten Trefferlisten gegen den originalen exhaustive-polygon-Geometriecheck verglichen; **196/196 korrekt, 103 bestätigte Polygon-Treffer**, 13 überlappende Punkte, 247 kandidatenweise exakte Prüfungen. Ein BBox-Kandidat bleibt bis zur Prüfung unbestätigt.

| Laufmetrik aus GitHub Actions | Wert |
|---|---:|
| Quellen-/Polygonobjekte | 266 |
| Namens-/BBox-/Lizenz-Metadaten `index.json` | 119.176 Bytes |
| 266 vollständige gehashte GeoJSON-Dateien | 572.603 Bytes |
| Kaltabruf – HTTP-Requests für Index + 66 Einzelpolygone | 67 |
| Kaltabruf – ausgelieferte Daten für diesen 196-Punkt-Durchlauf | 380.306 Bytes |
| Unterschiedliche zwischengespeicherte GeoJSON-Geometrien | 66 |
| Weitere HTTP-Requests für warmen zweiten 196-Punkt-Durchlauf | **0** |
| Kaltzeit alle Punkte inklusive 67 lokalen HTTP-Zugriffen und JS-Polygonprüfung | 169,54 ms |
| Warmlaufzeit alle Punkte lokal und vollständig im RAM | 1,77 ms |
| Lokale Treffer-Gleichheit mit dem Quell-Oracle | 196/196 |

**Wichtig:** Diese Zeiten stammen von einem temporären **localhost**-HTTP-Server in GitHub Actions und sind keinesfalls Nutzer-Internet-/iPhone-/iPad-Ladezeiten. Die 380 KB sind **tatsächlich ausgelieferte unkomprimierte HTTP-Body-Bytes** im Test, nicht die weltweit erforderliche Datenmenge oder CDN-Transfermessung. GeoJSON-Assets wurden nur temporär im Runner erstellt und nicht auf Pages veröffentlicht. Ein browserseitiger ESM-Adapter, echter Browser-/Mobil-Download, Manifest-Sharding, CORS auf CDN und OSM-Spezialflächenimport sind noch offen. Die 266 allgemeinen Polygone decken unverändert 0/15 Originalreferenzen der verlangten Gebietskategorien ab.

**Alle bestehenden App-Sicherheitsgates für den Forschungscommit vollständig `completed/success`:**
- [Node/Chromium #44339464206](https://github.com/pin2map/pin2map-new-test/actions/runs/44339464206)
- [Leaflet-Architektur #44339464174](https://github.com/pin2map/pin2map-new-test/actions/runs/44339464174)
- [Pages/HTTPS-Live-Provider/Chromium/WebKit pre/post #44339464180](https://github.com/pin2map/pin2map-new-test/actions/runs/44339464180)
- [Forschungs-CI #44339464362](https://github.com/pin2map/pin2map-new-test/actions/runs/44339464362)

**Serverentscheidung:** Das Dateiauslieferungsprinzip benötigt keinen laufenden eigenen Datenbank-/GIS-Server. Ein geplanter/importierter Build-Prozess ist weiterhin notwendig. Ein 119 KB großer weltweiter Index ist **nicht** gezeigt; die skalierbare Regionierung und ODbL-Compliance sind noch Forschungsthemen. **HERE/Geoapify sind mangels API-Zugang noch nicht an echten 15 Punkten getestet**; nur Schnittstellen dokumentarisch geprüft. Keine App-/SW-Änderung, v264 bleibt live.
