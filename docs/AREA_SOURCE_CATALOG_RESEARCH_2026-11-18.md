# Forschungsstufe 4 – Herkunft, Versionswechsel und reale Abdeckung von Flächenkatalogen (18.11.2026)

## Ziel
Nach dem geometrisch erfolgreichen 266-Polygon-/196-Punkte-Test wird die **Versorgung** der PWA untersucht: Ein dauerhaft nutzbarer weltweiter Flächenkatalog muss Aktualisierungen, Rechte, stabile Objektidentitäten, exakten Geometriebezug und die fachlichen Lücken offenlegen. **Wiederum isolierte Forschung; keine Änderung an PWA v264, main oder gespeicherten Nutzerdaten.**

## Recherchierte Beschaffungsoptionen
1. **Natural Earth (Public Domain):** offene, global generalisierte Länder und große Seen, aber 110m-Daten für präzisen Point-in-Polygon-Einsatz ungeeignet; der 10m-Schutzgebietsausschnitt ist kein globales Schutzgebietsregister.
2. **RESOLVE 2017 (CC BY 4.0):** terrestrische Ökoregionen, fachlich keine identischen Nationalpark-/Sperrgebiet-/Seeobjekte; Name und Quellenangabe müssen enthalten sein.
3. **Geofabrik OSM-Regionsextrakte (OSM/ODbL):** auf OSM-Basis nach Regionen erzeugte PBF-Extrakte werden etwa täglich aktualisiert und enthalten vollständige grenzüberschreitende Multipolygone. Für produktive OSM-IDs/Tags/Geometrien wäre ein **eigener kontrollierter Import-, Relation- und Aktualisierungsprozess** erforderlich, inklusive ODbL-Pflichten. Dies ist hier **noch nicht implementiert**.
4. **Overture Maps Base/Divisions:** offener thematischer GeoParquet-Bestand mit Wasser/Landnutzung und Verwaltungsgrenzen; Divisions ist nach Overture-Dokumentation ODbL. Ein selektiver Import wäre technisch aufwendiger, benötigt Prüfung von Namen, Landnutzungstypen, OSM-ID-Brücken, Quellenrechten und Aktualisierung. **Keine nachgewiesene Direktalternative für die 15 exakten OSM-Referenzobjekte.**

Quellen: https://download.geofabrik.de/technical.html ; https://download.geofabrik.de/index-v1-nogeom.json ; https://docs.overturemaps.org/getting-data/cloud-sources/ ; https://docs.overturemaps.org/guides/divisions/ ; https://www.openstreetmap.org/copyright ; https://osmfoundation.org/wiki/Licence/Attribution_Guidelines .

**Rechtlicher Hinweis:** Die Dokumentation führt Quellenlizenzen und mögliche ODbL-Share-Alike-/Attributionspflichten auf, trifft aber keine abschließende juristische Entscheidung zu einem späteren kombinierten oder abgeleiteten Datenbankprodukt. Vor Hosting/Verbreitung ist konkrete Lizenzprüfung nötig; Quellenbestände werden nicht blind zusammengeführt.

## Implementierter Source-/Update-Katalog
- `research/area-source-registry.cjs`: Kategorien, ausdrücklich deklarierte Quelllizenzen, Attribution und Identitätsfelder pro Datenquelle.
- `research/area-source-catalog.cjs`: quellenpräfixierte Gebietseinträge mit Version/Quellcommit, Bounding-Box, GeoJSON-Quelldatei/Objektposition, Geometrie-SHA-256 und separaten Lizenzangaben. **Keine Polygonkoordinaten im Manifest.** Unstabile Ersatz-IDs werden als solche gekennzeichnet und dürfen nicht unbesehen als persistente Objektschlüssel verwendet werden.
- `diff(previous,next)`: echte hinzugekommene/entfernte Kennungen, veränderte Geometrien, Metadaten und **Lizenz-/Attributionswechsel** getrennt erkennen; fragliche IDs als Reviewbedarf ausweisen. Es werden weder Nutzerdaten noch objektbezogene PWA-Cachetabellen bearbeitet.
- `research/area-source-catalog-live.cjs`: getrennt überprüfbare aus GitHub read-only gespeiste Herkunftsmanifest-Messung, exakte Quellcommits, Wiederholbarkeit und GIS-**Bestandslücken-Audit** gegen die ursprünglichen 15 Testkoordinaten. Dabei zählt der Test nur, ob **irgendein Polygon des gleichen Fachtyps** den Punkt enthält oder auch zufällig denselben normalisierten Namen trägt. **Ein Länder-Treffer ist niemals Nachweis, dass der gewünschte See oder das Sperrgebiet erkannt wurde.** Gleichlautender Name ist kein OSM-ID-Beweis und fehlender Treffer beweist nicht die weltweite Abwesenheit des Objekts.
- `tests/area-source-catalog.test.js`: Konflikte, Identität, Lizenzbeibehaltung, Snapshot-/Quellenversionsvergleich, Geometrieänderungen, fehlende und unverlässliche IDs, unzulässige Metadatentypen und klar begrenzte Aussagen.

## Noch nicht gelöst
- Kein eigener Speicher-/Serverdienst, keine GeoParquet-/PBF-Import-Pipeline und keine OSM-Relationserstellung/Updates.
- Kein gemessener aktualisierter Index aus zwei zeitlich verschiedenen Quell-Snapshots; `diff` ist anhand künstlich geänderter Testdaten geprüft, Wiederholbarkeit gegen denselben realen Stand gemessen.
- Kein landesweiter Anbieter- oder Lizenzvertrag für Militär-/Sonderflächen. OSM-Tags `military=training_area`, `landuse=military`, `boundary=protected_area/national_park`, `natural=water` wären bei einem eigenen OSM-Import selektiv zu berücksichtigen, aber nicht pauschal als vollständig zu behaupten.
- Auf echten Geräten und im Netz sind p50/p95, Transferbytes, CORS, Browser-Persistenz, Datenversionierung und Fehlerfälle separat zu messen.

**Abnahmebedingung:** Erst die echte GitHub-Source-Audit-Pipeline und alle App-Sicherheitsgates gelten als Forschungsergebnis. Keine App-Versionsänderung; `sw.js` bleibt v264.

### Unabhängiger Preview-Provider-Browsertest während der Freigabe

Beim Research-Commit `c9803c04715e3e2062df9bf445c6f11fa3abcefb` bestand die echte Quellen-/Geometrie-Audit-Pipeline [44332367245](https://github.com/pin2map/pin2map-new-test/actions/runs/44332367245), ebenso Node/Chromium [44332366933](https://github.com/pin2map/pin2map-new-test/actions/runs/44332366933) und Architektur [44332367051](https://github.com/pin2map/pin2map-new-test/actions/runs/44332367051). Das Pages-Gate [44332367016](https://github.com/pin2map/pin2map-new-test/actions/runs/44332367016) scheiterte **nach** bestandener HTTPS-/Assetprüfung im echten Live-Rügen/Jasmund-Provider-Test, dessen lang dauernde `page.evaluate`-Ausführung von einer Navigation unterbrochen wurde: `Execution context was destroyed, most likely because of a navigation`. Das ist **kein nachgewiesener Provider- oder Polygonfehler**; der Live-Provider-Nachweis des Commits ist offen.

Korrektur in `tests/area-live-provider.cjs`: Die isolierte echte Live-Providerprobe verwendet einen frischen Chromium-Browserkontext mit `serviceWorkers:"block"`, damit eine während der langsamen Anfrage eintreffende PWA-SW-Aktualisierung nicht unbemerkt eine neue Navigation erzeugt. **Sämtliche echten Nominatim-/Overpass-/OSM-Punkte, ID-/Polygon-Assertions und Fehlerbedingungen bleiben unverändert**. Die unabhängigen PWA-/ServiceWorker-/WebKit-Tests laufen weiter mit ihren regulären Workerkontexten. Ob die Navigation tatsächlich durch einen SW verursacht wurde, ist **nicht bewiesen**; der Schritt soll den Provider-Test gegen einen sachfremden Navigator-Lifecycle isolieren und wird erst nach vollständiger neuer Live-CI-Abnahme als erfolgreich geführt.
