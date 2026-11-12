# pin2map NEW – Architektur-Stabilisierung vor größerer Erweiterung

**Datum:** 2026-11-12  
**Entwicklungsbranch:** `feature/leaflet-modular-core`  
**Basis:** v147; v146 vom Auftraggeber vollständig persönlich abgenommen, v147-Maßstab technisch vollständig geprüft.  
**Ziel:** Vor weiterer Funktionalität konkrete technische Risiken reduzieren, ohne eine neue Engine, ein Build-Framework, Datenmigration oder ein ungerichtetes UI-Refactoring einzuführen.

## Prüfung der verbindlichen Grenzen

- `domain/` ist daten- und regelzentriert; keine UI/DOM-, Netzwerk-, Datenbank- oder Kartenengine-Abhängigkeit. `application/` kapselt Operationen über Ports. `ui/` erhält DOM/Interaktionen und keinen IndexedDB- oder Leaflet-Zugriff. `map-adapter-leaflet.js` hält die Leaflet-Implementierung; `app.js` verdrahtet die Module. Bestehende `tests/check-architecture.mjs` schützen diese Grenzen.
- Lokale Anwendung zuerst; Server/Sync nur nach Gate 3. `main`, `reference/*`, aktuelle IndexedDB-Projekte und vorgesehene Offline-Tile-Caches bleiben unangetastet.
- `app.js` ist trotz heutiger Größe keine automatisch neu aufzuteilende Fachmonolith-Datei. Die v116-Architekturabschlussentscheidung bleibt gültig: Nur bei konkretem Fachwachstum oder verbotenen Abhängigkeiten kleine Extraktionen.
- `styles.css` ist noch eine **bewusst pausierte** Übergangsarchitektur, aktuell **293** `!important`-Vorkommen bei bestehendem Maximalbudget **298**. Eine vollständige CSS-Sanierung wurde **nicht** durchgeführt oder als abgenommen behauptet; vorhandene Komponentenverträge und reale v147-Layouts bleiben geschützt.

## Stabilisierungsinkrement: eine aktive App-Paketquelle

**Problem:** Das bisherige Preview-Deployment kopierte mit `rsync` nahezu den gesamten Feature-Branch unter `/preview/`. So waren auch alte MapLibre-/PMTiles-Experimente, Diagnosedateien und nicht aktiv benötigte Artefakte öffentlich erreichbar, obwohl sie weder zum Leaflet-Startpfad noch zur Offline-App-Shell gehören.

**Lösung:** `scripts/preview-bundle.py` verwendet ausschließlich die kanonische `CORE`-Assetliste aus `sw.js` sowie die separat benötigte `sw.js` selbst. `index.html`, sämtliche Module, Styles und `manifest.webmanifest` werden so ohne parallele, manuell gepflegte Bundleliste publiziert. Das bestehende Pages-Workflow-Vendoring von **Leaflet 1.9.4 mit SRI-Prüfung**, die anschließend applizierten Preview-DB-/Cache-Präfixe, Release-URLs und die unveränderte `main`-Wurzel bleiben erhalten.

**Fail-closed:** Fehlt eine `CORE`-Datei, referenziert `index.html` eine nicht gecachte lokale Datei, enthält die Assetliste ungültige Pfade oder ist das Zielverzeichnis bereits belegt, bricht das Packaging ohne Löschung ab. Das Preview-Workflow-Gate stellt ausdrücklich sicher, dass MapLibre-/PMTiles-Demos, historische Diagnosen, Tests, Dokumentation und Skripte **nicht** in der Preview landen. Die Dateien bleiben im Repository als Referenz erhalten; keine Referenzbranch-Änderungen.

**Neue Qualitätsgates:** `tests/preview-bundle-contract.test.js` erzwingt die vollständig abgedeckten HTML-Assets, identische Skriptreihenfolge zwischen Startseite und Offline-Shell, echte Dateiexistenz, die harte Preview-Whitelist und nichtdestruktives Verhalten bei einem belegten Ziel. Zusätzlich enthält der GitHub-Pages-Workflow einen expliziten Auslieferungsassert für historische Dateien. Die üblichen Node-/Chromium-/Architektur-/HTTPS-Live-Gates bleiben notwendig.

## CSS- und Architekturregel für die **nächste** große Erweiterung

1. Vor jeder neuen UI-Komponente den konkreten CSS-Selektor und bisherigen Eigentümer festlegen. Frühere Überschreibungen analysieren, **nicht** durch neue pauschale `!important`-Schichten ergänzen.
2. Nur diejenigen Bestandsregeln konsolidieren, welche die **neue** Funktion berühren. Der Rest der pausierten CSS-Sanierung wird nicht ohne konkrete Änderung und visuelle Geräteabnahme angefasst.
3. Neues Fachverhalten in `domain/` bzw. `application/`, externe Provider in `adapters/`, Ansicht und Bedienung in `ui/`, Leaflet-Eingriffe nur über den Map-Adapter. `app.js` bleibt Kompositionswurzel.
4. Neue lokale Skripte zwingend in Startreihenfolge und `sw.js`-`CORE` aufnehmen, damit Build, Offline-Shell und Online-Start zusammenpassen. Das neue Testgate verhindert Divergenzen.
5. Neue externe Dienste vor produktiver Freigabe auf Anbieter-/Lizenz-/Zugriffsbedingungen und Fehlerverhalten prüfen. Gesonderte reale Anbieterabdeckung, simulierte Chromium-Antwort und persönliche iPhone-Abnahme klar unterscheiden.
6. Abschluss eines Änderungsinkrements nur nach Node-Tests, Architektur-Gates, echtem Chromium-Browserlauf, erfolgreichem Pages-Deployment und überprüftem Live-HTTPS-Stand. Keine unbegründete Behauptung eines realen iPhone-Tests.

## Bewusst nicht geändert

Keine App-UI, keine Datenmodelle, keine Persistenz/Schema- oder Offline-Kachel-Policy, keine Kartenanbieter, keine Server-/Sync-Architektur, keine Historienlöschung, kein größerer CSS-Umbau und keine Umstellung des Modulsystems. Der Nutzen dieses Inkrements ist eine kleinere und besser prüfbare Preview sowie ein fester technischer Vorbereitungsvertrag für die nächste Feature-Phase.

**Veröffentlichungs- und Testergebnisse:** Im jeweils aktuellsten Eintrag von `docs/PROJEKTSTATUS.md` festhalten. Gesonderte echte iPhone-Abnahme ist für dieses nicht-visuelle Packaging-Inkrement nicht vorwegzunehmen.
