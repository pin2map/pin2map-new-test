# PMTiles: dauerhafter Regionsspeicher und Offline-Ressourcen

Stand: 2026-11-09. **Vorbereitende isolierte Implementierung, keine Offline-Freigabe.**

## Gesicherter Ausgangspunkt

- Originale Leaflet-V18-Referenz: `reference/leaflet-v18-2026-11-09`.
- Abgenommene vollständige MapLibre-Integration: `reference/maplibre-full-integration-accepted-2026-11-09` und separat `pin2map-maplibre-preview/reference/maplibre-integration-v2-accepted-2026-11-09`.
- Eigene Stuttgart-Datei: `stuttgart-z12.pmtiles`, 2.866.574 Bytes, MVT, Zoom 0–12, durch `pmtiles verify` und SHA-256 geprüft; Browserdarstellung mit Protomaps-Light auf Nutzergerät bestätigt.

## Inkrement A: Persistenz einer lokalen PMTiles-Datei

Die isolierte Seite `https://pin2map.github.io/pin2map-maplibre-preview/pmtiles-persistent-lab-v1.html` erlaubt:

1. PMTiles-Datei auswählen und Header/Bereich/Größe vor dem Import prüfen.
2. Bewusst auf **„Datei lokal speichern“** klicken; Dateiblob per IndexedDB *structured clone* in der separaten Datenbank `pin2map-pmtiles-persistent-lab-v1` speichern.
3. Nach Abschluss der Schreibtransaktion Datei erneut lesen und Größe kontrollieren.
4. Per `navigator.storage.persist()` nach einer persistenteren Browser-Speicherzuordnung fragen; Ablehnung ist kein Fehler, muss aber sichtbar bleiben.
5. Über **„Gespeicherte Karte öffnen“** bei einem späteren Laden über `pmtiles.FileSource` rendern.
6. Über **„Gespeicherte Karte entfernen“** nur die Testkartendatei aus dieser Testdatenbank löschen.

Der Import lädt keine Datei hoch. **Kein** Service Worker und **kein** Offline-Start in dieser Testversion. Der Browser kann Daten wegen Quota, Nutzereinstellungen oder Speicherbereinigung entfernen. `navigator.storage.persist()` ist kein absoluter Löschschutz. Der Test ist auf höchstens 40 MiB je ausgewählter Datei und einen separaten Testdatensatz begrenzt. Die produktive Kartenverwaltung mit mehreren Regionen, Metadaten und Synchronisationsausnahmen bleibt offen.

## Inkrement B: Ressourcenpaket zum späteren Offline-Betrieb

Im öffentlichen Preview-Repository liegt `.github/workflows/package-offline-map-assets.yml`. Dieser unabhängige Workflow sammelt, prüft und verpackt:

- MapLibre GL JS 6.16.0: `maplibre-gl.mjs` und `maplibre-gl.css`.
- PMTiles 4.5.0: `pmtiles.js`.
- Protomaps-Basemap-Bibliothek 5.7.2: `basemaps.js`.
- Aus dem Upstream-`protomaps/basemaps-assets`-Repository: Glyph-PBF-Dateien (Noto Sans) einschließlich OFL-Lizenzdateien und `sprites/v4/light` als PNG/JSON (1x und 2x), soweit im Repository vorhanden.

Der Paketinhalt wird auf maximal 100 MiB begrenzt, mit SHA-256-Manifest und protokolliertem Git-Commit des Upstream-Asset-Repositories. Die Bibliotheksversionen sind festgelegt; **der basemaps-assets Upstream-Stand ist noch nicht auf eine konkrete Commit-SHA gepinnt** und muss vor Produktionsfreigabe fixiert werden. Die tatsächliche Ausführung des Workflows und ein erzeugtes Paket sind noch nicht bestätigt. Das Artefakt wird weder in GitHub Pages publiziert noch in die PWA integriert.

Quellen:
- <https://docs.protomaps.com/basemaps/maplibre> – Fonts-/Sprite-Anforderungen
- <https://github.com/protomaps/basemaps-assets> – Assets und jeweilige Lizenzdateien
- <https://pmtiles.io/typedoc/classes/FileSource.html> – lokale FileSource

## Offene Freigabegates

- [ ] Erfolgreiche Ausführung des Asset-Paket-Builds und Überprüfung aller Style-Glyph-Familien, Unicode-Ranges, Sprite-Dichten und Lizenzen.
- [ ] Ressourcen unter derselben Origin bzw. explizit kontrollierten URLs zur Verfügung stellen; keine CDN-URLs in der Offline-Kartenstilkonfiguration.
- [ ] Separater Service Worker precacht die App-Shell, JS und CSS **ohne pauschal fremde Kartentile-Downloads zu cachen**; sauberer Versionswechsel und klarer Fehler-/Updatepfad.
- [ ] Einmaligen vollständigen Kartenregions-Import einschließlich Integritäts-/Metadatenprüfung und Transaktionsabschluss vor der Offline-Freigabe gewährleisten.
- [ ] Offline-Start und Kartendarstellung bei **aktivem Flugmodus** auf iPhone; Kartenbewegungen innerhalb der gespeicherten Region, Beschriftungen und Symbole prüfen.
- [ ] Mehrere Regionen, gezieltes Löschen, Speicherlimits und Bereinigung in iOS/Safari/Brave prüfen.
- [ ] Nach Abnahme adapterseitige Integration in den eigentlichen pin2map-Entwicklungszweig; `main` und Referenz V18 bis dahin unverändert.

**Statusentscheidung:** Gespeicherte Datei ≠ vollständige Offlinefähigkeit. Erst wenn Shell, Kartendaten, Stilbibliothek, Schriftkacheln und Symbole offline verfügbar sind, kann die gesamte PWA ohne Netzwerkverbindung starten und eine Karte zeichnen.

## Inkrement C: eigenständiges Offline-Labor als Build-Artefakt (2026-11-09)

Im Preview-Repository ist das Skript `scripts/assemble-offline-lab.py` ergänzt. Der Workflow `package-offline-map-assets.yml` nutzt es nach dem Herunterladen der festgelegten Bibliotheken und Kopieren der Protomaps-Assets, um ein **separates, als ZIP/Artifact herunterladbares Testpaket** zusammenzustellen.

Das Paket enthält:

- `index.html` mit auf `./vendor/` umgeschriebenen JS-/CSS-Bibliotheken.
- Eine eigene Kopie der lokalen PMTiles-Speicherprobe: IndexedDB `pin2map-pmtiles-persistent-lab-v1`, Datei bewusst importieren, öffnen und löschen.
- Den Protomaps-Light-Stil mit auf `./assets/fonts/` und `./assets/sprites/v4/light` umgestellten URLs.
- Einen auf den eigenen Test-Unterordner begrenzten Service Worker `offline-stuttgart-sw.js` mit vollständigem Install-Precache des eingebundenen Ressourcenpakets. Die Installation scheitert, wenn eine erforderliche Datei nicht geladen wird; fremde Origins werden nicht abgefangen, und PMTiles-Dateien bleiben ausschließlich in IndexedDB.
- Manifest mit SHA-256 und Bytezahl jeder im Paket enthaltenen Datei. Der Build kontrolliert die Bibliotheks-Dateien, Schrift-/Sprite-Pfade sowie die Maximalgröße des Testpakets (100 MiB).

Das Paket ist **noch nicht erzeugt, nicht online bereitgestellt und nicht auf einem iPhone im Flugmodus getestet**. Außerdem ist ein kompletter Voll-Precache der Schriftressourcen auf iOS wegen Speichergrenzen noch zu überprüfen. Weitere Produktionsvoraussetzungen: Quell-Asset-Commit fest pinnen, Herkunft und Lizenzen prüfen, korrekte Offline-Start-/Update- und Recovery-Meldungen und dauerhafte Datenhaltung nachweisen.

Der Build erzeugt nur das Artefakt `pin2map-stuttgart-offline-lab-package` (14 Tage), keine automatische Änderung der GitHub-Pages-Veröffentlichung. Die Ausgabe muss in einem **eigenen Unterordner** einer HTTPS-Website bereitgestellt werden, damit der Service Worker nicht die bestehende MapLibre-PWA beeinflusst. Die Karte `stuttgart-z12.pmtiles` ist aus Datenschutz- und Größengründen weiterhin **nicht Teil des Pakets** und wird beim Test lokal importiert.

Automatische statische Regression: `tests/check-pmtiles-offline-package.mjs` kontrolliert die URL-Umstellung, den begrenzten Service-Worker-Scope und die isolierte Persistenzschnittstelle. Der tatsächliche GitHub-Actions-Lauf und sein Ergebnis stehen noch aus.

## Inkrement D: Offline-Start und Cache-Versionierung korrigiert (2026-11-09)

- Der Offline-Labor-Builder `scripts/assemble-offline-lab.py` wurde um eine Inhalts-basierte Service-Worker-Versionierung ergänzt. Für jeden erwarteten Dateipfad werden Dateiinhalte gehasht; der 16-stellige Fingerprint steckt im Cache-Namen. Bei Versionswechsel darf eine vorhandene funktionierende Installation erst nach erfolgreichem vollständigem Neu-Install die alte Version ersetzen.
- **Wichtiger Fehler behoben:** Eine Offline-Navigation zum Ordner `/offline-stuttgart-lab/` musste auf das gecachte `./index.html` zurückfallen; normale Cache-Nachschläge nach der Ordner-URL greifen nicht automatisch auf die Datei zu. Ohne diese Regel wäre das Offline-Labor zwar teilweise vorgehalten, sein Start aus der PWA-/Startbildschirm-URL aber nicht zuverlässig.
- Registrierung ist zusätzlich auf einen URL-Pfad mit `/offline-stuttgart-lab/` begrenzt und darf weder am Root der Preview-Website noch innerhalb der bestehenden PWA einen Service Worker aktivieren. Der Worker verarbeitet nur Same-Origin-Dateien aus seinem eigenen Unterordner und enthält keine PMTiles-Download-/Synchronisationslogik.
- Der Workflow `package-offline-map-assets.yml` prüft jetzt Python-Syntax vor der Paketierung und kontrolliert anschließend ausdrücklich Cache-Version, Offline-Navigation, eigene Origin, Registrierungs-Unterordner, lokalen Asset-Verweis und das Fehlen eines PMTiles-Archivs im Worker-Cache. Eine zusätzliche statische Regression `tests/check-pmtiles-offline-package.mjs` sichert die Anforderungen im Entwicklungszweig.
- Reale Pfade `sprites/v4/light.json` und `sprites/v4/light@2x.json` sind im öffentlichen Upstream-Protomaps-Asset-Repository nachgewiesen; der Glyph-PBF-Pfad existiert dort ebenfalls als Binärdatei. Die tatsächliche Paketgröße, vollständige Fonts/Sprites, Lizenzkopien und der Build-Erfolg sind weiter zu prüfen.
- Der Offline-Labor-Build wurde **nur vorbereitet**, nicht als erfolgreich verifiziert oder deployed. Keine Offline-Freigabe, keine Änderung an `main` von `pin2map-new-test` oder den beiden gesicherten Referenzen.

## Inkrement E: Prüfung des vollständigen Offline-Pakets (2026-11-09)

- Im Preview-Repository ist die eigenständige Build-Kontrolle `scripts/check-offline-package.mjs` hinzugekommen. Sie prüft alle im generierten Service Worker gelisteten Ressourcen auf vorhandene und nichtleere Dateien, verhindert doppelte oder ausbrechende Pfade und validiert SHA-256 sowie Bytezahl gegen `manifest.json`.
- Pflichtbestandteile: lokale MapLibre-, PMTiles- und Protomaps-Bibliotheken, `index.html`, IndexedDB-Speicherprobe, normale und @2x-Light-Sprites, Noto-Sans-Regular-/Medium-Glyphs, `fonts/OFL.txt` und `UPSTREAM-CREDITS.md`.
- Protomaps-`basemaps-assets` enthält nach GitHub-Prüfung **`fonts/OFL.txt`**, aber **keine eigene `sprites/LICENSE.txt`**. Der Workflow kopiert jetzt die tatsächlich vorhandene Schriftlizenz und die im Upstream-README enthaltenen Herkunfts-/Lizenzangaben der Sprites; damit wird keine nicht existente Datei vorausgesetzt.
- Das CI-Skript wird nach dem Zusammenbau auf dem Ausgabeverzeichnis `output/` ausgeführt. Es prüft außerdem, dass HTML/JS keine bekannten CDN-URLs mehr verwenden, der SW-Navigations-Fallback vorhanden ist und Registrierung/Speicher eigenständig bleiben.
- Nur Quellcode und Dateiverknüpfungen sind bestätigt. Der erfolgreiche Build eines **fertigen** Offline-Assets-Pakets, das tatsächlich verfügbare Artefakt und ein Geräte-/Flugmodus-Test sind noch **nicht** verifiziert. Offene Lizenzkontrolle: vor Produktfreigabe sämtliche mitgelieferten Bibliotheks-Lizenzhinweise und exakte Upstream-SHA als Quellenverzeichnis fixieren.

## Inkrement F: Separate Offline-Testanwendung tatsächlich bereitgestellt (2026-11-09)

- Der GitHub-Actions-Paketworkflow wurde um einen **fail-closed**-Deployment-Schritt erweitert: Erst nach erfolgreich durchlaufener Paketierung, JavaScript-Prüfung, Ressourcen-/SHA-256-Validierung und Artifact-Upload werden ausschließlich die generierten Dateien unter `offline-stuttgart-lab/` in `pin2map-maplibre-preview/main` geschrieben. Kein Force-Push, kein Löschen anderer Seiten, keine Änderung an `pin2map-new-test/main`.
- GitHub-Dateiprüfung bestätigt die Bereitstellung: `offline-stuttgart-lab/index.html`, `manifest.json`, `offline-stuttgart-sw.js`, `offline-register.js`, Glyphs und Light-Sprites sind im Preview-Repository vorhanden.
- Das veröffentlichte Manifest enthält **1040 Dateien mit insgesamt 19.077.861 Bytes (18,19 MiB)**, darunter **1024 Glyph-PBF-Dateien**. Der Service Worker listet 1039 Dateien für den Precache und verwendet die inhaltsbasierte Version `pin2map-stuttgart-lab-67a476a99139ee27`. Bibliotheken: MapLibre 6.16.0, PMTiles 4.5.0, Basemaps 5.7.2.
- Bereitschaftsanzeige `offlineReadiness` ist in der veröffentlichten HTML-Seite eingebaut und testet nach Registrierung und Worker-Aktivierung sechs wichtige lokale Cache-Dateien. **Vorhandener GitHub-Code beweist noch nicht, dass GitHub Pages den Ordner bereits ausliefert oder dass Safari/Brave den vollständigen Cache im iPhone installiert hat.** Ein Online-Vorbereitungstest mit anschließendem Flugmodus-Test bleibt erforderlich.
- Die PMTiles-Region ist nicht im 18,19-MiB-Paket enthalten und muss einmalig unter der separaten IndexedDB-Speicherprobe importiert werden. Die registrierte Worker-Scope bleibt `/offline-stuttgart-lab/`, ohne Zugriff auf die bisherigen Produktdaten.

## Inkrement G: MapLibre-6-Web-Worker-Fehler im ersten Offline-Labor (2026-11-09)

- Nutzer-Screenshot der erstmals veröffentlichten Testseite `offline-stuttgart-lab/` zeigt: **„Kartenfehler: Worker failed to load. Check that the worker URL is correct.“** Die vorhandene lokale PMTiles-Datei wurde bereits in einer älteren, online geladenen MapLibre-Testseite erfolgreich dargestellt. Daher liegt die neue Störung im lokalen MapLibre-Renderer-Paket, nicht nachweisbar im Kartendatenarchiv.
- Fehlerursache: MapLibre GL JS 6 benötigt zusätzlich zum `maplibre-gl.mjs` die Laufzeitdatei `maplibre-gl-worker.mjs`, je nach Distribution außerdem das benachbarte `maplibre-gl-shared.mjs`. Beide fehlten bislang aus `output/vendor/`. Die offizielle MapLibre-6-Distribution und die Dokumentation zum Worker-URL-Aufruf stützen den Befund.
- Der Preview-GitHub-Workflow `package-offline-map-assets.yml` lädt jetzt beide zusätzlichen Dateien in `output/vendor/`. Der Paket-Builder verlangt sie ausdrücklich und setzt in der auszuliefernden Karten-JavaScript-Datei vor der Karteninitialisierung `maplibregl.setWorkerUrl(new URL("./vendor/maplibre-gl-worker.mjs", import.meta.url).href)`.
- Der vollständige Pakettest `scripts/check-offline-package.mjs` prüft das Vorhandensein beider zusätzlichen Module in der Service-Worker-Precache-Liste sowie die explizite URL-Konfiguration. Damit kann ein unvollständiges Paket nicht mehr als gültig hochgeladen und veröffentlicht werden.
- **Stand der erneuten Bereitstellung bei letzter GitHub-Dateiprüfung:** `offline-stuttgart-lab/vendor/maplibre-gl-worker.mjs` und `offline-stuttgart-lab/vendor/maplibre-gl-shared.mjs` waren weiterhin nicht vorhanden; die aktualisierte Website und der erfolgreiche Neu-Build sind daher **noch nicht bestätigt**. Vor erneuter Freigabe ist die direkte GitHub-Dateiprüfung beider Pfade zu wiederholen und gegebenenfalls der Actions-Log auszuwerten. Kein erneuter Flugmodus-Test der alten Version.

## Inkrement H: Korrigiertes MapLibre-6.16-Worker-Paket nachweislich veröffentlicht (2026-11-09)

- **Korrektur zur vorigen Arbeitshypothese:** Die gepinnte MapLibre-Version **6.16.0** verwendet einen eigenständigen `maplibre-gl-worker.mjs` ohne zusätzliche `maplibre-gl-shared.mjs`. Ein vorsorglicher Download der Shared-Datei wurde wieder entfernt, nachdem die Versionsdokumentation dies klargestellt hat.
- GitHub-Überprüfung der veröffentlichten Dateien bestätigt jetzt `offline-stuttgart-lab/vendor/maplibre-gl-worker.mjs` (519.372 Bytes im Manifest), die `setWorkerUrl(new URL("./vendor/maplibre-gl-worker.mjs", import.meta.url).href)`-Anweisung **vor** der MapLibre-Karteninitialisierung und den Worker-Eintrag in `manifest.json`.
- Veröffentlichtes Manifest: **1.041 Dateien** (gegenüber 1.040 zuvor). Der Worker und der Programmpfad sind in der GitHub-Pages-Quellstruktur nachweislich vorhanden. Damit ist der zuvor sichtbare Packaging-Fehler auf Quellebene behoben.
- **Noch offen:** Der erneute Browser-Test durch den Nutzer und die Bestätigung, dass der Service-Worker-Cache die neue Fassung aktiviert. Ein neues Gerätetest-Ergebnis darf nicht vorweggenommen werden.
