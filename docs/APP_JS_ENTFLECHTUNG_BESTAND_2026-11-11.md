# app.js – Bestandsaufnahme und erster Entflechtungsschritt

**Datum:** 2026-11-11  
**Quelle:** `app.js` und vorhandene Module auf `feature/leaflet-modular-core` (Quellstand v100).  
**Status:** Architektur-/Umsetzungsplanung, noch keine Programmänderung und keine bestandene CI-/Browserabnahme.

## 1. Iststand

`app.js` umfasst derzeit 18.536 Zeichen und enthält weiterhin die zentrale Closure, die Initialisierung und Ereignisverdrahtung. Die Datei erzeugt/verdrahtet die bereits vorhandenen Domain-, Application-, UI-, Karten- und Speicherbausteine und enthält zugleich DOM-Menülogik, Render-Koordination und Speicher-Timing.

| Verantwortung in `app.js` | Vorhandene Abgrenzung | Noch zentral |
| --- | --- | --- |
| Start, Fehlerfall, Composition Root | `domain/project-model.js`, `map-adapter-leaflet.js`, IndexedDB-Adapter | `init()`, Modulinstanziierung, Script-/SW-Start |
| Projektpersistenz | `adapters/storage/indexeddb-project-store.js` | `save()`, `dbWrite()`, `persistViewport()` |
| Pins und Ebenen | `application/pin-operations.js`, `application/layer-operations.js`, Filter-Operationen | UI-Ereignisse, Modaldialog-Text, Speicher- und Render-Folge |
| Suche | `application/place-search-service.js`, `domain/place-search.js`, `ui/search-results.js` | `runSearch()`, `choosePlace()`, Meldungen/Selektion |
| Karte und Pinbewegung | `map-adapter-leaflet.js`, Marker-, Gesten-, Move-/Positionierungscontroller | Ereignisbindung, Fit-all, Synchronisierung der Panels |
| UI-Zustand und Panels | `ui/ui-state.js`, `ui/shell.js`, `ui/pin-editor.js`, `ui/layer-view.js` | Basiskarten-Menü, vereinzelte direkte DOM-/ARIA-Aktionen |

Die Fachmodule verwenden teilweise globale `window.Pin2Map...`-Exporte und werden über `index.html` geladen. Bei jeder neuen Datei deshalb Skriptreihenfolge, Service-Worker-`CORE`, Vorschau-Packaging und CommonJS-Tests synchron behandeln.

## 2. Erste empfohlene vertikale Extraktion: Basiskarten-Menü

**Vorgesehenes neues Modul:** `ui/basemap-menu.js` (name bei Implementierung verbindlich beibehalten).

**Ziel:** Rein visuelle Menüsteuerung aus `app.js` lösen. Das Modul darf DOM/ARIA kennen, aber weder Karte/Leaflet noch Projektzustand/IndexedDB verändern.

**Schmale Schnittstelle** als Vorschlag:

- Konstruktor mit `getElement`, `document`, `onSelect(value)`, `onOpening()` und optional `allowedValues` (nur `street`/`topo`).
- `render(selectedBasemap)`: `aria-pressed` und `is-selected` für die Menüeinträge.
- `open()/close()/toggle()`: `hidden` und `aria-expanded`; `onOpening` schließt andere Panels und Suchtreffer ausschließlich über injizierte Callbacks.
- `bind()/dispose()`: ausschließlich eigene Klick-, Escape- und Außenklick-Listener; Tastaturfokus wiederherstellen.
- `onSelect` meldet nur die erlaubte Auswahl. **`app.js` bleibt verantwortlich** für `state.basemap`, `mapAdapter.setBasemap()`, `save()` und die weitere Komposition.

**Ersetzbare Stellen in `app.js`:** `setTileLayer()` (nur DOM-Menüteil), `closeBasemapMenu()`, die Basemap-Click-/Escape-Bindings in `bind()` und die entsprechenden Outside-Click-Zweige. Die tatsächlichen bisherigen Öffnungs-/Schließkonventionen, Panel-/Suchtreffer-Sperren und Fokus-Rückgabe müssen identisch bleiben.

**Nicht in diesem Schritt ändern:** `styles.css`, Pin-/Ebenenmodell, IndexedDB-Schema, Tile-/Leaflet-Adapter, Service-Worker-Cachepolicy, Synchronisation, `main`.

## 3. Absicherung und Gates vor und nach Umsetzung

1. Vor dem Codeeingriff v100-Baseline verifizieren: Node-22-`node --test tests/*.test.js`, alle `tests/check-*.mjs`, GitHub Actions/Pages, HTTPS-Preview und Browser-Smoke. Fehlende Belege **offen**, nicht bestanden werten.
2. Modul mit DOM-Fakes ohne Browser-Kartenbibliothek testen: Öffnen, Schließen, Auswahl, ungültige Werte, `aria-pressed`, `aria-expanded`, Escape, Außenklick, Fokus und `dispose`.
3. Integration mit der echten Komposition testen: Basiskarte wechseln/erneut wählen, persistieren, Menü und andere Panels schließen, Trefferliste schließen, keine unbeabsichtigte Pin-/Datenänderung.
4. `index.html`-Skriptreihenfolge, `sw.js`-`CORE`, neue Version und Preview-Isolation kontrollieren. CSS bleibt exakt unverändert.
5. Erst nach erfolgreichen tatsächlichen Tests und verifizierter `/preview/`-Auslieferung als fertig und sichtbar abgenommen markieren.

**Nächste Implementierungsaufgabe:** kleine Extraktion des Basiskarten-Menüs nach `ui/basemap-menu.js`, **nur wenn Qualitäts-Baseline/Prüfzugriff eine verlässliche Validierung erlauben**. Das ist keine Freigabe zum ungeprüften Merge nach `main`.


## 4. Erste Umsetzung – Basiskarten-Menü in eigenem UI-Modul (v101, 2026-11-11)

- **Im Feature-Branch implementiert:** `ui/basemap-menu.js` (DOM-/ARIA-only, `render`, `open`, `close`, `toggle`, `bind`, `dispose`, Tastatur/Escape, Klick außerhalb, Fokus, Auswahl). Die Auswahl und die `onOpening`-Aktion werden mittels injizierter Callbacks an `app.js` weitergegeben; keine Kartendaten oder IndexedDB im UI-Modul.
- `app.js`: Basiskarten-Menü-Events und direkte ARIA-/Menü-DOM-Steuerung ersetzt; `mapAdapter.setBasemap(state.basemap)`, Projektzustand und `save()` bleiben ausdrücklich im Kompositionscode. Die übrigen Ereignis-/Pin-/Ebenen-Flows unverändert.
- `index.html`: `ui/basemap-menu.js` nach `ui/shell.js` und vor `app.js` geladen. `sw.js`: neue Datei im App-Shell-`CORE`, Release **pin2map-new-v101** (im Preview-Workflow zu pin2map-preview-v101 umbenannt, tatsächliche Auslieferung nicht belegt).
- Neuer `tests/basemap-menu.test.js`: isolierte DOM-Fakes für Auswahl, Zustand/ARIA, ungültige Werte, Offen/Schließen, Escape, Außenklick, Fokus, Listener-`dispose` sowie HTML-/SW-/Kompositionsverdrahtung.
- **Nach dem Commit erneut statisch aus GitHub gelesen:** Modul, Delegation, fehlende alte Menühörer, Skriptreihenfolge, `CORE` und v101. `app.js` schrumpfte von 18.536 auf 17.467 Zeichen. CSS und persistierte Daten unverändert; `main` nicht geändert.
- **Noch NICHT unabhängig nachgewiesen:** vollständiger `node --test tests/*.test.js`, `tests/check-*.mjs`, erfolgreicher Preview-Push-Workflow, öffentliche v101-HTTPS-Auslieferung, echter Browserwechsel der Basiskarte (inklusive gespeichertem Zustand) und mobile Abnahme. Die Quelldatei ist vorhanden, aber eine vollständig getestete/live freigegebene Anwendung wird hieraus nicht abgeleitet.
- **Nächster Schritt:** technischen Validierungsrückstand schließen. Erst danach nächste `app.js`-Verantwortlichkeit auswählen. CSS-Pause bleibt unverändert.


## 5. Prüfrunde v101 – isolierte Ausführung, offene Gates (2026-11-11)

- Aus dem aktuellen Feature-Branch wurde `ui/basemap-menu.js` bezogen und in einem getrennten JavaScript-V8-Kontext mit DOM-Doubles tatsächlich ausgeführt. **12 Checks bestanden:** ARIA, Auswahl-Rendern, Klick/Toggle, gültige/ungültige Auswahl, Fokus, Innen-/Außenklick, Escape, Enter, Listener-Entfernung sowie statische Integrationsverträge für `app.js`, `index.html` und `sw.js`.
- Dies ist ausdrücklich **nicht** `node --test tests/*.test.js`; die vollständige Node-22-Suite und `tests/check-*.mjs` bleiben ungetestet. Ebenso nicht durchgeführt: echter Browser-/Leaflet-/Speicher-Smoke oder Endgeräteprüfung.
- GitHub-Abfragen zum Code-Test-Commit `809d6d8f3a12a6f2ee08c2326a73257ddc2cf31f` lieferten keine Commit-Statuses und keine PR-gefilterten Workflow-Runs; damit ist kein push-getriggerter Pages-Erfolg belegt oder widerlegt. HTTP(S)-Abrufe der Preview-URL und der v101-Assets waren aus der verfügbaren Umgebung nicht erfolgreich, direkter git-Zugriff scheiterte an DNS.
- **Status:** Modulfunktion isoliert positiv, veröffentlichte Gesamtanwendung **weiterhin nicht freigegeben**. Keine Quellcode-Änderungen, kein Merge, keine Datenoperationen.


## 6. Verifizierte v101-Gates nach Reparatur zweier veralteter Tests (2026-11-11)

- Zunächst bei `Modular core checks` **135/137** Tests erfolgreich; historische, gegen die inzwischen gelöschte CSS-Mobile-Regel und die ausgelagerte Basiskartensteuerung gerichtete Assertions waren die zwei Fehler. Nach Korrektur der Tests `tests/css-base-readability-contract.test.js` und `tests/lucide-button-design.test.js` keine Änderung an `styles.css`, `app.js`, UI-Modul oder Service Worker.
- **Bestätigter Node-Job:** 137/137 bestanden, <https://github.com/pin2map/pin2map-new-test/actions/runs/42981343397>.
- **Bestätigter Chromium-Job:** automatischer UI-Test für Pin-Selektion, Verschieben, Datenpersistenz und Offline-Reload erfolgreich; Basiskarten-Menüinteraktionen in diesem Smoke noch nicht explizit nachgewiesen.
- **Architektur-Gate:** erfolgreich, <https://github.com/pin2map/pin2map-new-test/actions/runs/42981343418>.
- **Preview-Gate:** erfolgreich, <https://github.com/pin2map/pin2map-new-test/actions/runs/42981343415>. Umfasst `node --test tests/*.test.js`, `tests/check-*.mjs`, Pages-Deploy, **über HTTPS geladene exakt versionierte Preview-Assets** sowie reale Chromium-Live-Start-/Reload-Checks für Telefon-, Tablet- und Desktop-Viewports einschließlich Tracking-URL. Freigegebene Preview-Quelle `pin2map-preview-v101` unter <https://pin2map.github.io/pin2map-new-test/preview/>.
- **Weiter offen:** gezielte funktionale Basiskarten-Menü-Interaktionen (street↔topo, ARIA, Escape, Außenklick, Fokus, Persistenz) im echten Browser und manuelle Geräteabnahme. Nicht nach `main` übernehmen ohne Freigabe.

## 7. Gezielte Basiskarten-Menü-Browser-Regression bestätigt (2026-11-11)

- Test `tests/browser-smoke.cjs` um reale Chromium-Menüaktionen erweitert: Topografische Karte wählen und Auswahl nach Reload wiederfinden, Escape/Fokus, Außenklick, Schließen von Einstellungen, Rückwechsel zur Straßenkarte samt erneuter Persistenzkontrolle und `aria-pressed`-/`aria-expanded`-Zustände. Anschließend wurden die bereits vorhandenen Pin-/Move-/Offline-Tests im selben Browserlauf bestanden.
- **Chromium + Node grün:** <https://github.com/pin2map/pin2map-new-test/actions/runs/42981727159> (Browser-Log: `PASS – basemap toggle, street/topo, ARIA, focus, Escape, outside click, panels, persistence`).
- **Architektur-Gate grün:** <https://github.com/pin2map/pin2map-new-test/actions/runs/42981727121>.
- **GitHub Pages v101 grün:** <https://github.com/pin2map/pin2map-new-test/actions/runs/42981727136>, einschließlich vorgelagerter Node- und Vertragschecks sowie HTTPS-/Live-Kartenstart-Prüfung. **Einordnung:** Der Menüinteraktions-Test lief gegen die lokal in CI gehostete Entwicklungsfassung, nicht direkt gegen die publizierte HTTPS-Preview. Die veröffentlichte v101-Preview wurde unabhängig vom Workflow auf Version/Assets/Start/Reload geprüft.
- Für dieses Testinkrement keine Änderung an `app.js`, `styles.css`, `sw.js`, den UI-Modulen oder der Persistenz; PWA-Quelle v101 unverändert. Manuelle Gerätebedienung und CSS-Endabnahme bleiben offen.

## 8. Zweite Extraktion – sichtbare Pins einpassen (v102, 2026-11-11)

- `application/fit-visible-pins.js` erhält Pins, Ebenen und aktuelle Filter, nutzt die bereits vorhandene Filteroperation und einen injizierten Karten-Port, stellt ausschließlich Viewport-Anforderungen und Rückmeldung bereit. Keine Leaflet-, DOM-, Speicher- oder UI-Text-Abhängigkeiten im Use Case.
- Die bestehende `fitAllPins`-Callback-Funktion in `app.js` bleibt als Kompositionswrapper und gibt die alten Parameter/Callbacks an die Anwendungsschicht weiter.
- `index.html`-Skriptreihenfolge und `sw.js`-`CORE` erweitert; Quellkennung **v102**. Der neue `tests/fit-visible-pins.test.js` schützt 0/1/mehrere Treffer, Zoom, Optionen und Packaging.
- **Sichtbare Gestaltung, CSS, persistierte Daten und `main` unverändert.** Zum Zeitpunkt der Dokumentation laufen Node-, Browser-, Architektur- und Pages-Jobs noch; ein erfolgreiches Deployment muss separat belegt werden.
- **Persönlicher Testbedarf:** Kein Gerätetest für diesen Schritt angefordert, solange die automatisch nachgewiesenen Port- und Browser-Szenarien ausreichen. Wenn eine echte mobile Bedienungsprüfung nötig wird, ausdrücklich und konkret ankündigen.

## 9. v102-Regression – historischer Release-Test korrigiert (2026-11-11)

- Erster v102-`Modular core checks`-Lauf <https://github.com/pin2map/pin2map-new-test/actions/runs/42982200374> schlug mit **140 bestanden, 1 fehlgeschlagen** fehl: `tests/basemap-menu.test.js` verlangte noch exakt `pin2map-new-v101` statt eine gültige fortlaufende Release-Kennung. Das war eine veraltete Testannahme, keine Änderung am Basiskarten-Feature. Das anfängliche Preview-Deployment <https://github.com/pin2map/pin2map-new-test/actions/runs/42982200384> wurde dadurch beim Vorabtest gestoppt.
- Alter Regressionstest wurde gegen `pin2map-new-v\\d+` verallgemeinert (Commit `02c96fdb73ced077258f7e9f4b8fd1042627e43c`); künftige v103+-Releases benötigen dafür keinen Test-Edit. Weder `app.js`, Kartenadapter, CSS noch SW wurden bei der Reparatur verändert.
- Im aktualisierten Commit lief der Node-Job erfolgreich und das Architektur-Gate <https://github.com/pin2map/pin2map-new-test/actions/runs/42982337852> war erfolgreich. Chromium- und Pages-Endergebnis zum Zeitpunkt dieser Notiz noch offen: <https://github.com/pin2map/pin2map-new-test/actions/runs/42982337850> und <https://github.com/pin2map/pin2map-new-test/actions/runs/42982337887>.

## 10. v102-Gates bestätigt; manueller Test angefordert (2026-11-11)

- Korrigierter v102-Quellcode: **`Modular core checks` erfolgreich**, einschließlich Node-Tests und bestehender Chromium-Pin-/Basiskarten-/Offline-Smokes: <https://github.com/pin2map/pin2map-new-test/actions/runs/42982337850>.
- Architekturprüfung **erfolgreich**: <https://github.com/pin2map/pin2map-new-test/actions/runs/42982337852>.
- **Pages-Workflow erfolgreich**, inklusive Validierung vor Veröffentlichung, HTTPS-Asset-Versionierung und realem Preview-Start-/Reload-Test: <https://github.com/pin2map/pin2map-new-test/actions/runs/42982337887>. Entwicklungsvorschau: <https://pin2map.github.io/pin2map-new-test/preview/>.
- Die neue Fit-Funktion hat direkte isolierte Node-Tests für 0/1/mehrere Pins; der bestehende Browser-Smoke sichert den übrigen Karten-/Pin-/Offline-Bedienpfad. **Noch nicht ausdrücklich im Chromium-Szenario getestet:** Klick auf „Alle sichtbaren Pins anzeigen“ selbst.
- **Konkreter manueller Nutzer-Test angefordert:** auf iPhone/iPad in Preview einen eigenen Testpin setzen, Karte wegschieben, ◎ bei Zoomkontrollen antippen und prüfen, ob der Pin sichtbar zurückkehrt. Optional mehrere sichtbare Pins. Keine bestehenden Pins löschen und keine Daten zurücksetzen. Erst nach Nutzerrückmeldung manuelle Geräteabnahme als bestanden markieren.

## 11. Manuelles Feedback und Topo-Fix v103 (2026-11-11)

- Gerätetest durch Nutzer: **Autozoom erfolgreich**; Topo-Auswahl selektierbar, aber Kachelfläche komplett grau, während Straßenkarte funktioniert. Mehrere Pins in den Screenshots bleiben sichtbar. Daher nicht als vollständig abgenommen markieren.
- Externer Provider-Befund: <https://github.com/der-stefan/OpenTopoMap/issues/399> dokumentiert Safari-/WebKit-Probleme mit `{s}.tile.opentopomap.org`. Im Leaflet-Adapter wurde deshalb nur die topografische URL durch die dort vom Betreiber genannte Alternative `https://tile.top-o-map.de/{z}/{x}/{y}.png` ersetzt. Neue Quellrelease **v103**; Straßenkarten-URL unverändert.
- Zusätzlicher Test `tests/topographic-tile-source.test.js` schützt die Kartenquelle. Die bisherige Chromium-Suite hatte keine reale Tile-Load-Kontrolle. Eine im CI hinzugefügte zwingende `naturalWidth`-Prüfung scheiterte an fehlenden externen Bildern (20s Timeout) trotz funktionierender Karten-/UI-Logik. Die Prüfung wurde in eine informative, kurze Providerdiagnose umgewandelt; der Test verifiziert weiter die tatsächliche Kacheladresse. **Kein positiver Nachweis für den Topo-Dienst in Safari, nur der Nutzer kann ihn hier abschließend testen.**
- SW wird zu v103 angehoben; `styles.css`, Pins, IndexedDB-Schema und `main` unverändert. Der anschließende Commit-Run `388c86a2697af690e3f359b1c2db55b8d95730aa` bestand **Node+Chromium** (<https://github.com/pin2map/pin2map-new-test/actions/runs/42983369204>), **Architektur** (<https://github.com/pin2map/pin2map-new-test/actions/runs/42983369159>) und **Pages-/HTTPS-Live-Start** (<https://github.com/pin2map/pin2map-new-test/actions/runs/42983369172>). Die CI-Probe bestätigte kein echtes Topografie-Kachelbild; reale Safari-Kachelauslieferung bleibt ein konkreter Nutzer-Test.

## 12. v104 – historische Ursachenprüfung und kontrollierter Topo-Host-Test (2026-11-11)

- Wiederholter realer Nutzerbefund: v103-Topografie in Safari und Brave privat grau; Straßenkarte funktioniert unverändert. Die Topografie war laut Nutzer vor dem Umbau sichtbar.
- GitHub-Historie (u. a. `fc1dac5b75af` und `984db125c72a`) belegt: Vor und nach Einführung des Leaflet-Adapters identische `{s}.tile.opentopomap.org`-Vorlage. Der v103-Wechsel auf `tile.top-o-map.de` war ein nachträglicher Versuch, keine bewiesene Lösung.
- Einzelner Webabruf bestätigte ein Kartenbild von `a.tile.opentopomap.org/6/33/21.png`; einige andere Domains waren über den Webabruf nicht erreichbar. Deshalb testweise v104 auf **`a.tile.opentopomap.org`** (ein Teilserver, keine Subdomain-Rotation), ohne übrige Karten-/Datenlogik zu ändern. Diese Stichprobe ist keine belastbare Erfolgsgarantie auf einem Gerät.
- Quellversion `pin2map-new-v104`, angepasste Bildquellen- und Chromium-Contracts; CSS, `app.js`, Nutzerdaten und `main` unangetastet.
- **CI vollständig grün**: <https://github.com/pin2map/pin2map-new-test/actions/runs/42984307184> (Node+Chromium), <https://github.com/pin2map/pin2map-new-test/actions/runs/42984305834> (Architektur), <https://github.com/pin2map/pin2map-new-test/actions/runs/42984305659> (Pages/HTTPS).
- **Offenes reales Gate:** Topo-Kacheln müssen auf Safari und Brave tatsächlich sichtbar werden. Nicht als erledigt markieren, bevor der Nutzer es bestätigt. Bei erneutem Ausfall zuerst HTTP-/TLS-/Tile-Diagnostik statt weiterer spekulativer Providerwechsel.

## 13. v104 – erfolgreiche manuelle Bestätigung (2026-11-11)

- Nach der Änderung auf `https://a.tile.opentopomap.org/{z}/{x}/{y}.png` meldet der Nutzer auf die konkrete erneute Geräteprüfung **„funktioniert“**. Damit ist die zuvor graue Topografische Karte im v104-Test erfolgreich sichtbar geworden. Die kurze Rückmeldung nennt nicht ausdrücklich getrennte Ergebnisse für Safari und Brave; beide daher nicht einzeln als bestätigt ausweisen.
- Die vorherigen v104-CI-/Pages-/HTTPS-Ergebnisse bleiben erfolgreich; zusammen mit dem positiven manuellen Befund ist diese Störung für die aktuelle v104-Konfiguration behoben. Die dauerhafte Verfügbarkeit des externen Anbieters ist nicht garantiert.
- Die Topografie-Hostadresse zunächst nicht ändern. Nächster Entwicklungsschwerpunkt wieder `app.js`-Modularisierung, CSS-Sanierung bleibt pausiert. Bei künftig erforderlichen manuellen Abnahmen den Nutzer klar und konkret informieren.

## 14. v105 – Suchformular-UI ausgelagert, CI und Preview erfolgreich (2026-11-11)

- Neues `ui/search-form.js` kapselt Such-Submit, Eingabetrim, Button-Ladezustand, Fehlermeldungen und Status-/Trefferübergabe. `app.js` bleibt reiner Verdrahter von `placeSearch.search(query,{state,allowed,onCacheWrite:save,...})` und den bestehenden Ergebnis-/Pin-Callbacks. Keine Änderung an `application/place-search-service.js`, Geocoder oder Leaflet.
- `index.html` und `sw.js`-App-Shell um Modul ergänzt; v105. `app.js` 17.316 → 16.475 Zeichen. `tests/search-form.test.js` und die neue netzwerkfreie Such-Submit-Prüfung in `tests/browser-smoke.cjs` hinzugefügt; keine Nominatim-Anfrage.
- **Final bestätigte GitHub-Workflows:** <https://github.com/pin2map/pin2map-new-test/actions/runs/42986596323> (Node+Chromium grün), <https://github.com/pin2map/pin2map-new-test/actions/runs/42986596334> (Architektur grün), <https://github.com/pin2map/pin2map-new-test/actions/runs/42986596332> (Preview-/HTTPS-Deployment und Live-Kartenstart grün), finaler Test-Commit `ea10f3e65b74995a26b0d67662a6948febff670a`.
- Weiterhin v104-Topo-Kachelquelle `a.tile.opentopomap.org` und vom Nutzer bestätigte Funktion. CSS und persistierte Daten unverändert. **Kein manuell erforderlicher Gerätetest** für diese UI-Verantwortlichkeitsentflechtung; wenn wieder notwendig ausdrücklich benennen.

## 15. v106 – UI-Dialog zur Ebenen-/Privatpin-Löschung ausgelagert (2026-11-11)

- Neues `ui/bulk-delete-dialog.js` steuert Dialog, Titel, Erklärung, `showModal()`, `close`-Handler, Abbrechen, Bestätigen und `dispose()` – ohne DOM-fremde Fach-/Speicher-/Kartenregeln. `app.js` nutzt `bulkDeleteDialog.show(id,info)`; die bestehenden `layerOps.deletionInfo`-/`layerOps.deleteLayerOrPins`-Operationen bleiben fachlicher Eigentümer.
- HTML-/Offline-App-Shell-Einbindung und v106-Service-Worker-Version synchronisiert. `app.js` wurde von 16.475 auf 16.167 Zeichen verkürzt; CSS und Pin-Daten unangetastet.
- Neuer `tests/bulk-delete-dialog.test.js` deckt Privat- und Nichtprivat-Fall, Dialogtexte, `cancel`/Escape-äquivalentes Schließen, bestätigte IDs, Mehrfachöffnung und ungültige Details ab. Zusätzlicher echter Chromium-Test führt eine **abgebrochene Löschung eines bestehenden privaten Pins** aus und prüft, dass der Pin erhalten bleibt.
- Zwischenlauf: alter `tests/search-form.test.js` erwartete wörtlich v105, jetzt releaseunabhängig; erster Browser-Entwurf klickte auf einen durch den noch geöffneten Pin-Editor ausgeblendeten Ebenenbutton, Testreihenfolge entsprechend korrigiert.
- **Final belegte v106-Gates:** Node+Chromium erfolgreich <https://github.com/pin2map/pin2map-new-test/actions/runs/42987360761>, Architektur erfolgreich <https://github.com/pin2map/pin2map-new-test/actions/runs/42987360727>, Pages/HTTPS-Preview erfolgreich <https://github.com/pin2map/pin2map-new-test/actions/runs/42987360733>. Browser-Log: `PASS – private bulk-delete cancel preserves the pin`. Finaler Test-Commit `fc6c9b060f101b594104e1a667643b25f14902f8`.
- **Persönlicher Testbedarf:** kein weiterer für v106. Bei späterem Bedarf ausdrücklich melden. `main`, `a.tile.opentopomap.org`, CSS und IndexedDB unverändert.

## 16. v107 – Pin-Editor-Eingabesteuerung in ein UI-Modul getrennt (2026-11-11)

- Neues `ui/pin-editor-actions.js` bindet die Formularereignisse für Pin-Name (`input` und `blur`), Ebene (`change`) und Sichtbarkeit (`click`), ohne selbst Geschäftszustand oder IndexedDB zu kennen. Injected Callbacks lassen Fachregeln und Speichern in `app.js`. `bind()` ist idempotent, `dispose()` entfernt alle eigenen Listener.
- `app.js` 16.167 → 16.096 Zeichen. `index.html`-Skriptreihenfolge, `sw.js`-`CORE`, v107-Version aktualisiert. CSS, Kartentiles, Leaflet, Pin-/Ebenenmodell, `main` und Daten unverändert.
- `tests/pin-editor-actions.test.js` prüft Eventweitergabe, Blur-Trim, Ebenenzuordnung-Event, Sichtbarkeitsaktion, Listener-Sicherheit und Packaging. `tests/browser-smoke.cjs` verifiziert in echtem Chromium **Pin umbenennen, Blur-Bereinigung und Persistenz nach Reload** neben den vorhandenen Moves/Offline/Topografie-/Privat-Dialog-Checks.
- **Vollständige Gates erfolgreich:** Node/Chromium <https://github.com/pin2map/pin2map-new-test/actions/runs/42987990734>, Architektur <https://github.com/pin2map/pin2map-new-test/actions/runs/42987990728>, Pages-/HTTPS-/Live-Prüfung <https://github.com/pin2map/pin2map-new-test/actions/runs/42987990743>, finaler Test-Commit `283ac61fefea7fec03aafbad8eb956590f24d27a`. Kein Gerätetest durch Nutzer für diesen Schritt angefordert.
