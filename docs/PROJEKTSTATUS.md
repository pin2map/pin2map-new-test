# pin2map NEW – zentraler Projektstatus

**Stand:** 2026-11-11 (v110: Speicher-/Viewport-Koordination modularisiert; Node/Architektur/Chromium/Pages grün) · **Pflege:** bei jedem größeren Arbeitsschritt und bei jeder Änderung der nächsten Priorität.  
**Statusart:** Arbeitsstand aus dem GitHub-Feature-Branch; kein pauschaler Nachweis einer erfolgreichen öffentlichen Veröffentlichung.

> **Einstieg nach Chatwechsel:** Diese Datei zuerst lesen, dann `AGENTS.md`, `docs/PROJEKTWEGWEISER.md` und die unten für die Aufgabe genannten Fachdokumente. Den Branch und die zuletzt geänderten Quelldateien in GitHub erneut prüfen. Nicht nur diese Statuszusammenfassung als Beleg verwenden. Ein einfaches **„ok“** bedeutet: eigenständig mit dem nächsten sinnvollen Schritt weitermachen.

## 1. Arbeitsumgebung und Schutzgrenzen

- **Repository:** `pin2map/pin2map-new-test`.
- **Einziger derzeitiger Entwicklungsbranch:** `feature/leaflet-modular-core`.
- **Entwicklungsvorschau:** https://pin2map.github.io/pin2map-new-test/preview/
- **Stabile Seite:** https://pin2map.github.io/pin2map-new-test/ — Branch `main` niemals ungefragt ändern.
- **Preview-Pipeline:** `.github/workflows/preview-pages.yml`; testet vor dem Deploy und isoliert Preview-Datenbank und Cache vom stabilen Stand.
- **Referenzzweige `reference/*`**, Nutzerdaten, IndexedDB, Offline-Caches und persistierte Pins nicht unbeabsichtigt ändern oder löschen.
- Die Vorgänger-App `pin2map/pin2map` ist funktionale und gestalterische Referenz, **keine** zu übernehmende Architekturvorlage.

## 2. Aktueller Entwicklungsstand

- **Quellversion:** **v110**, nach achter `app.js`-Entflechtung (Speicher- und Viewport-Koordination). Zweite `app.js`-Modulentflechtung bleibt auf v102-Codebasis bestehen; CSS unverändert B38. Quelle: `sw.js`, `const CACHE='pin2map-new-v110'`. Die zur Preview-Auslieferung gehörende Kennung wird im Workflow in `pin2map-preview-v110` umgeschrieben. Nicht mit einer tatsächlich überprüften installierten Version verwechseln.
- **CSS-Sanierung:** Anfang **402** `!important`-Vorkommen, derzeit **298**. B38 entfernte die redundante ursprüngliche `min-width:0`-Angabe in `.search input`; die späteren Mindestbreiten-Eigentümer bleiben gültig.
- **Sanierungsprotokoll:** `docs/CSS_SANIERUNG_ETAPPE_A_2026-11-10.md`; alle Schritte B1–B38 sind dort erläutert.
- **CSS-Regelvertrag:** `docs/CSS_ARCHITEKTURREGELN.md`; temporärer Grenzwert in `tests/css-debt-budget.test.js` ist 298.
- **Besonders geschützter Suchbutton:** 42px Antippfläche, 30px sichtbarer Ring, 18px Lupe. Kein unbeabsichtigtes Umgestalten von Kreis, Suchkapsel oder Ausrichtung.
- **Technische Bausteine:** Leaflet-Karte, Pin-/Ebenenverwaltung, IndexedDB-Persistenz, Suche, UI-Module, Service Worker und Offline-App-Shell; maßgeblichen tatsächlichen Implementierungsstand in den jeweiligen Dateien prüfen, nicht allein aus dieser Kurzliste ableiten.
- **Architekturphase (Beschluss 2026-11-11):** CSS-Stabilisierung bei **B38/v100 pausiert**, nicht als CSS-Endabnahme abgeschlossen. Weiteres kosmetisches Altregel-Abtragen (B39 ff.) zurückgestellt. Nach Prüfung der technischen Baseline folgt die schrittweise Entflechtung von `app.js` nach `docs/MODULARCHITEKTUR.md`, ohne CSS zugleich groß umzubauen.

## 3. Verbindliche Entscheidungen und Arbeitsweise

- Ein Pin gehört **genau einer** Ebene an.
- Die **private Ebene** gehört zur Basisversion.
- **Fotos sind nicht vorgesehen.**
- Vorrang: wartbare modulare, lokal/offline nutzbare PWA; Server und Synchronisation gemäß aktuellem Entwicklungsfahrplan erst nach Gate 3.
- Kleine, überprüfbare Inkremente; bestehende Darstellung und Funktionen bewahren, Risiken und Rückweg sichtbar machen.
- Jede App-Änderung erhält passende Regressionstests; vorhandene Tests auf historisch überholte Selektoren/Erwartungen kontrollieren.
- **Prüfstatus immer trennen:** (a) statische Quelltextkontrolle, (b) tatsächlich ausgeführte lokale/isolierte Tests, (c) GitHub-Actions-Lauf, (d) GitHub-Pages-HTTPS-Auslieferung einschließlich Version/Assets, (e) Browser-/Geräteabnahme.
- Ein Commit ist **keine** abgeschlossene Veröffentlichung. Ist ein Gate mangels Zugriff nicht prüfbar, ausdrücklich **offen** dokumentieren.
- Kein erneuter iPhone-/iPad-Gerätetest bei rein interner Bereinigung ohne erwartete sichtbare Änderung. Bei UI-Änderungen die vorher abgenommene Darstellung gezielt vergleichen.
- **„ok“** ist eine Fortsetzungsanweisung, keine Testabnahme.

## 4a. v101 – CI-/Preview-Verifikation nach Testreparatur (2026-11-11)

- **CI-Ursache geklärt:** Workflow `Modular core checks` meldete zunächst 135 bestandene und 2 fehlgeschlagene Tests. Fehler: `tests/css-base-readability-contract.test.js` erwartete eine im CSS-Sanierungsverlauf entfernte mobile `.topbar`-Grundregel; `tests/lucide-button-design.test.js` suchte die bereits nach `ui/basemap-menu.js` extrahierten DOM-/Escape-Ereignisse noch in `app.js`. Die beiden Tests wurden an die **bereits existierenden** Eigentümer angepasst, ohne App- oder CSS-Änderung. Commits `f365bca105b306e06eac97aad82a37ec7dea7ec6` und `773cc29f652a6c44b6c0379c9b29988713412f6a`.
- **Node-Tests tatsächlich in GitHub Actions erfolgreich:** `Modular core checks` – Node-Job `node-tests`: **137 bestanden, 0 fehlgeschlagen**. <https://github.com/pin2map/pin2map-new-test/actions/runs/42981343397>
- **Automatisierter Chromium-Test tatsächlich erfolgreich:** `chromium-smoke` desselben Laufs: Pin-Selektion, Move/Cancel/Confirm, Persistenz und Offline-Reload bestanden. Das ist ein automatisierter Test auf der Entwicklungsfassung, kein Nutzer-Gerätetest und keine spezifische Basiskarten-Menü-Bedienungsabnahme.
- **Architekturprüfungen erfolgreich:** <https://github.com/pin2map/pin2map-new-test/actions/runs/42981343418>.
- **Preview-Deployment erfolgreich:** <https://github.com/pin2map/pin2map-new-test/actions/runs/42981343415>, Head-Commit `773cc29f652a6c44b6c0379c9b29988713412f6a`. Die Pipeline bestätigte (1) gesamte Vorabvalidierung inkl. `node --test tests/*.test.js` und `tests/check-*.mjs`, (2) GitHub-Pages-Deployment, (3) reale HTTP(S)-Abfrage der **exakten Preview-Service-Worker-Version und aktualisierten Assets**, (4) automatisierten Live-Leaflet-Start, Controls, Attribution und Reload für Smartphone, Tracking-URL, Tablet und Desktop. <https://pin2map.github.io/pin2map-new-test/preview/>
- **Technischer Freigabestand:** v101-Quellstand über GitHub Actions inkl. HTTPS-Preview verifiziert. Manuelle iPhone-/iPad-/Desktop-Geräteabnahme und eine explizite Nutzerprüfung der Basiskarten-Auswahl inklusive deren Fokus-/Escape-Interaktion bleiben **offen**. Die automatischen Live-Smokes testen primär den Kartenstart und allgemeine Steuerung, nicht alle Menüinteraktionen. Die App nicht ohne gesonderte Freigabe nach `main` mergen.
- **Quellstand:** weiterhin `pin2map-new-v101` / Preview `pin2map-preview-v101`; `styles.css` B38, 298 `!important`; App-/Datenmodule und Nutzerdaten unverändert durch die Testreparatur.

## 4b. v101 – gezielte Basiskarten-Browser-Regression bestanden (2026-11-11)

- `tests/browser-smoke.cjs` erweitert, **keine Anwendungs-, CSS-, Worker- oder Datenänderung**. Test-Commit `9d6cc153121a03fa7fa3fb02d192dd018a618ebc`.
- Tatsächlicher headless Chromium-Test auf lokal bereitgestellter Feature-Branch-Version **bestanden**: `street`→`topo`→Reload→`street`→Reload, Auswahl und `is-selected`/`aria-pressed`, `aria-expanded`, Fokus-Rückgabe, Escape, Außenklick auf Karte, Schließen des Einstellungen-Panels und Fehlerfreiheit. Die bisherige Browser-Regression für Pin-Auswahl, Verschieben, Datenhaltung und Offline-Reload bleibt grün.
- **Modular core checks vollständig erfolgreich**, einschließlich Node-Tests und Chromium: <https://github.com/pin2map/pin2map-new-test/actions/runs/42981727159>.
- **Leaflet architecture gates erfolgreich:** <https://github.com/pin2map/pin2map-new-test/actions/runs/42981727121>.
- **Pages-Preview erneut erfolgreich bereitgestellt:** <https://github.com/pin2map/pin2map-new-test/actions/runs/42981727136>; unveränderte v101-Assets über HTTPS und automatisierter Live-Start-/Reload-Test im Preview-Workflow bestanden. Die neue gezielte Menü-Browser-Regression fand dagegen im **localhost-Chromium-Job** statt, nicht im publizierten Live-Smoke.
- **Weiter offen:** explizite manuelle iPhone-/iPad-/Desktop-Bedienabnahme; weitere `app.js`-Modularisierung und spätere vollständige CSS-Konsolidierung. Kein Merge nach `main` ohne Freigabe.

## 4c. Zweite `app.js`-Extraktion – sichtbare Pins einpassen (v102, 2026-11-11)

- Neues `application/fit-visible-pins.js`: unabhängiger Anwendungsfall für die Option „Alle sichtbaren Pins anzeigen“; nutzt injizierten `pinFilter` und `mapPort` statt Leaflet/DOM/IndexedDB. Erhält leeren Zustand mit Meldungs-Callback ohne Kartenbewegung, Einzelpin mit Zoom mindestens 13, Mehrfach-Pins mit Padding [35,35]/maxZoom 15 und anschließender UI-Layout-Aktualisierung.
- `app.js` delegiert ausschließlich diesen Anwendungsfall über `fitVisiblePins(...)`; der Kartenadapter und Pin-/Ebenenzustand bleiben an ihren bisherigen Verantwortlichkeiten. `index.html` lädt das Modul vor `app.js`; `sw.js` nimmt es in den Offline-App-Shell-`CORE` auf, Quellversion `pin2map-new-v102`.
- Neuer `tests/fit-visible-pins.test.js` prüft 0/1/mehrere sichtbare Pins und die Integration mit HTML/App-Shell. Beim ersten v102-Run zunächst **140/141 Node-Tests bestanden**: der ältere Basiskarten-Test hatte den SW-Release-String noch hart auf v101 festgelegt. Diese versionsabhängige Altannahme wurde in `tests/basemap-menu.test.js` durch einen versionstoleranten App-Shell-Vertrag ersetzt (Commit `02c96fdb73ced077258f7e9f4b8fd1042627e43c`). Der erneute **Node-Job, der Chromium-Smoke, die Architekturprüfung und das GitHub-Pages-Deployment sind inzwischen erfolgreich bestätigt**. <https://github.com/pin2map/pin2map-new-test/actions/runs/42982337850> · <https://github.com/pin2map/pin2map-new-test/actions/runs/42982337852> · <https://github.com/pin2map/pin2map-new-test/actions/runs/42982337887>. Die veröffentlichte v102-Preview ist in GitHub Actions per HTTPS-Version-/Asset-Check und Live-Start geprüft; manueller Gerätetest „Alle sichtbaren Pins anzeigen“ bleibt offen.
- `styles.css` und das CSS-Budget 298 bleiben unverändert. Keine Änderung an IndexedDB, Pin-Datenschema, `main` oder Referenzzweigen.
- **Nutzergerätetest:** noch nicht erforderlich, solange die gezielten automatischen Tests und Browser-/Live-Gates laufen. Falls ein Layout-/Interaktionsregressionsverdacht entsteht, wird eine konkrete Testanleitung für die Preview gegeben.

## 4d. Manuell gemeldeter Topo-Tile-Ausfall und v103-Korrektur (2026-11-11)

- **Nutzerbefund:** „Alle sichtbaren Pins anzeigen“ funktioniert bei mehreren vorhandenen Pins. Auswahl „Topografische Karte“ erzeugte dagegen auf dem Gerät nur graue Kacheln bei weiterhin sichtbaren Pins; Rückwechsel auf „Straßenkarte“ zeigt die normalen Kartenkacheln. Screenshot dokumentiert. Das ist **ein echter manueller Regressionsbefund** und keine erfolgreiche Topo-Abnahme.
- **Wahrscheinlicher externer Grund:** `map-adapter-leaflet.js` bezog Topo-Kacheln bisher über `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png`. Der OpenTopoMap-Betreiber dokumentiert in `der-stefan/OpenTopoMap#399` WebKit/Safari-Verbindungsprobleme mit diesem Host und nennt `https://tile.top-o-map.de/{z}/{x}/{y}.png` als funktionierende alternative Betreiber-Domain. Das ist eine plausible Ursache, nicht bereits die individuelle Browser-Netzwerkdiagnose.
- **Korrektur auf Feature-Branch:** allein der Topo-Tile-Host wird auf `tile.top-o-map.de` geändert. Straßenkarte, Pin-Zustand, Filter, Autozoom, CSS und IndexedDB unverändert. SW-App-Shell-Version **v103**, neues `tests/topographic-tile-source.test.js`.
- **Testlücke präzisiert:** Der bisherige Chromium-Test bestätigte nur Auswahl-/ARIA-/Persistenzzustand, nicht tatsächliche Bildauslieferung. Ein neuer externer `naturalWidth>0`-Test zeigte in GitHub Actions **Timeout**, weil der Runner keine Topo-Bilder über die Ersatz-Domain empfing. Das beweist keinen iOS-Erfolg und keinen Defekt des lokalen Menü-Controllers. Für CI bleibt deshalb ein deterministischer Host-/Menüvertrag verpflichtend, eine kurz begrenzte Bildauslieferungsprobe wird diagnostisch protokolliert, aber ein Fremdserver-Ausfall blockiert die Anwendungstests nicht. **Der echte Topo-Erfolg muss im Safari-/iPad-/iPhone-Gerätetest überprüft werden.**
- **CI/Pages inzwischen bestätigt:** Für den Test-Commit `388c86a2697af690e3f359b1c2db55b8d95730aa` sind `Modular core checks` (Node und Chromium), Architektur-Gate und Preview-Deployment erfolgreich: [Node/Chromium](https://github.com/pin2map/pin2map-new-test/actions/runs/42983369204), [Architektur](https://github.com/pin2map/pin2map-new-test/actions/runs/42983369159), [Pages/HTTPS](https://github.com/pin2map/pin2map-new-test/actions/runs/42983369172). Die Live-Startprüfung testet **nicht** die echte Topo-Auslieferung in Safari, und die externe CI-Kachelprobe hat keinen Bildempfang nachgewiesen. **Safari-Gerätetest ist jetzt nötig.** Kein Merge nach `main`.

## 4e. Wiederholter Topo-Ausfall, historische Ursachenprüfung und v104 (2026-11-11)

- **Neuer Nutzerbefund:** In Safari **und** Brave privat bleibt die topografische Kachelfläche auch nach v103 grau, der Wechsel zurück zur Straßenkarte funktioniert. Der Nutzer bestätigt, dass Topografie **vor dem Umbau** angezeigt wurde. **Keine erfolgreiche manuelle Topo-Abnahme.**
- **Historischer GitHub-Vergleich:** `app.js` vor der Modularisierung und `map-adapter-leaflet.js` ab seiner Einführung am 2026-11-09 nutzten beide dieselbe Topo-Kachel-URL `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png`. Der Umbau selbst hat diese Adresse also nicht verändert. Erst die unbelegte v103-Reparatur schwenkte auf `tile.top-o-map.de`. Das beweist weder den Anbieter als Fehlerursache noch schließt es andere indirekte Regressionen aus.
- **Netzwerk-Gegenprobe:** Über einen Webabruf war `https://a.tile.opentopomap.org/6/33/21.png` als Kartenbild erreichbar, während `tile.top-o-map.de` und die `b`-/`c`-Teildomains bei derselben Webprüfung nicht abrufbar waren. Diese Stichprobe ist keine vollständige Netzwerk-/Geräteanalyse.
- **Kontrollierte v104-Änderung:** Topografie im Leaflet-Adapter auf **`https://a.tile.opentopomap.org/{z}/{x}/{y}.png`** festgelegt. Anders als zuvor kein Wechsel zwischen `a`, `b`, `c`; im Übrigen identische Topo-Kachelquelle, Straßenkarte unverändert. `sw.js` App-Shell-Release auf `pin2map-new-v104` erhöht. Quellenvertrag-/Browser-Tests angepasst, keine CSS-, Pin-, Persistenz- oder `main`-Änderung.
- **CI/Pages verifiziert:** `Modular core checks` mit Node und Chromium **erfolgreich** <https://github.com/pin2map/pin2map-new-test/actions/runs/42984307184>, Architektur-Gate **erfolgreich** <https://github.com/pin2map/pin2map-new-test/actions/runs/42984305834>, Preview/HTTPS-Live-Start **erfolgreich** <https://github.com/pin2map/pin2map-new-test/actions/runs/42984305659>. Diese Checks beweisen den Quell-/Kartenstartvertrag, **nicht** die korrekte Topo-Kachel-Anzeige bei realen Safari-/Brave-Nutzern.
- **Jetzt erforderlich:** v104 in Safari **und** Brave privat auf dem betroffenen Gerät aufrufen, Topografische Karte wählen und prüfen, ob die Kacheln tatsächlich sichtbar sind; bei weiterhin grauer Fläche keine weitere blind wechselnde Tile-Domain, sondern gezielte Fehler-/HTTP-/TLS-Diagnose durchführen. `app.js`-Modularisierung bleibt bis zur Fehlerklärung pausiert.

## 4f. v104 – Topografische Karte vom Nutzer erfolgreich bestätigt (2026-11-11)

- **Nutzerrückmeldung auf den ausdrücklich angeforderten v104-Test:** „funktioniert“. Nach dem zuvor in Safari und Brave privat reproduzierten grauen Hintergrund ist die topografische Karte nun wieder sichtbar. Positiver manueller Funktionsbefund für v104; die Rückmeldung spezifiziert nicht einzeln, welcher Browser geprüft wurde. Daher nicht beide Browser separat als nachgewiesen bezeichnen.
- Die stabile Konfiguration verwendet im Leaflet-Adapter `https://a.tile.opentopomap.org/{z}/{x}/{y}.png` ohne automatischen Wechsel auf `b`/`c`. **Diese Quelle vorerst beibehalten.** Nicht erneut den Provider oder die Tile-Rotation ohne nachvollziehbaren Anlass ändern.
- Vorherige automatische v104-Gates (Node/Chromium, Architektur und veröffentlichte Preview per HTTPS) bestanden; manuelle Bestätigung ist eine zusätzliche Qualitätsprüfung. Autozoom wurde bereits bei v102 vom Nutzer erfolgreich getestet. Die Straßenkarte funktionierte in den vorigen manuellen Vergleichstests.
- **Nächste Priorität:** `app.js`-Modularisierung nach erneuter Prüfung des Iststands fortsetzen; bei künftigen Änderungen ausdrücklich mitteilen, ob ein persönlicher Test benötigt wird. CSS bleibt B38 mit 298 `!important`, `main` und persistierte Nutzerdaten bleiben geschützt.

## 4g. Dritte `app.js`-Entflechtung – Suchformular-UI (v105, 2026-11-11)

- `ui/search-form.js` neu: UI-Controller für Formular-Submit, getrimmte Suchanfrage, Suchbutton-Ladezustand, Ergebnis-/Statusmeldungen, überholte Anfragen und eigene Event-Listener. Suchanbieter/Cache/Throttling bleiben in `application/place-search-service.js`, Ergebnisdarstellung in `ui/search-results.js`, Karten-/Pin-Zuordnung weiterhin in `app.js`. Dienst-/State-/Speicherzugriff nur über injizierte Callbacks.
- `app.js` gibt den bisherigen `runSearch`-Handler ab und verdrahtet das neue Modul; Umfang von 17.316 auf 16.475 Zeichen reduziert. `index.html` lädt es vor `app.js`, `sw.js` enthält es im Offline-`CORE` (Quellkennung `pin2map-new-v105`).
- Neuer `tests/search-form.test.js` prüft leere Eingaben, Ergebnisse, Statusmeldungen, Stale-Result, Event-Binding/Dispose und Packaging. `tests/browser-smoke.cjs` prüft zusätzlich echten Chromium-Submit mit deaktiviertem Nominatim-Zugriff und sichtbarer Rückmeldung ohne externe Suchanfrage.
- **Alle finalen Gates nach dem Browser-Testcommit `ea10f3e65b74995a26b0d67662a6948febff670a` erfolgreich:** [Node+Chromium](https://github.com/pin2map/pin2map-new-test/actions/runs/42986596323), [Architektur](https://github.com/pin2map/pin2map-new-test/actions/runs/42986596334), [Pages/HTTPS-Liveprüfung](https://github.com/pin2map/pin2map-new-test/actions/runs/42986596332). Die ausgelieferte Preview ist versioniert v105; direkte Nominatim-Suche wurde bewusst **nicht** ausgelöst.
- **Schutzbereiche unverändert:** Topo-Quelle `a.tile.opentopomap.org` (v104 manuell bestätigt), Straßenkarte, Autozoom, CSS B38/298 `!important`, Pin-/Ebenenschema, IndexedDB und `main`. Kein zusätzlicher Nutzergerätetest erforderlich für diesen rein kontrollierten UI-Entflechtungsschritt. Bei Bedarf ausdrücklich anfordern.

## 4h. Vierte `app.js`-Entflechtung – Löschbestätigungsdialog (v106, 2026-11-11)

- Neues UI-Modul `ui/bulk-delete-dialog.js` enthält ausschließlich Dialogtitel, Beschreibung, Öffnen, Bestätigen-/Abbrechen-Behandlung und Listener-Lebenszyklus. `application/layer-operations.js` enthält unverändert die fachlichen Löschregeln, einschließlich der Privatschicht-Schutzregel.
- `app.js` gibt die direkte `bulkDialog`-DOM-/`onclose`-Steuerung ab. Die tatsächliche Mutation `layerOps.deleteLayerOrPins`, Entfernen der Auswahl, Speicherung und Neu-Rendering bleiben außerhalb des UI-Moduls. `app.js` 16.475 → 16.167 Zeichen.
- `index.html` lädt das neue Modul vor `app.js`; `sw.js` enthält es in der Offline-App-Shell, Kennung **pin2map-new-v106**. CSS unverändert (B38, 298 `!important`). Topografie bleibt auf `a.tile.opentopomap.org`; keine Änderung an Pins/IndexedDB-Schema/`main`.
- `tests/bulk-delete-dialog.test.js` schützt die Formulierungen, Privat-Pin-Verhalten, Abbrechen, wiederholte Öffnung, `dispose` und Packaging. Im **echten Chromium-Smoke** wurde nach dem Schließen des Pin-Editors der private Löschdialog geöffnet, `Abbrechen` gedrückt und nachgewiesen, dass der Pin noch vorhanden ist. Die übrigen Pin-/Move-/Offline-/Basiskarten-Tests bleiben erfolgreich.
- Erster v106-Run war wegen einer **alten v105-Release-Fixierung in `tests/search-form.test.js`** rot; dieser Test wurde dauerhaft release-unabhängig gemacht. Ein zunächst fehlgeschlagener Chromium-Versuch versuchte die in geöffnetem Pin-Editor versteckte Ebenenschaltfläche zu bedienen; der Test wurde auf die tatsächliche Bedienreihenfolge korrigiert. **Keine App-Funktionsreparatur erforderlich**.
- **Finale GitHub-Actions-Gates nach Test-Commit `fc6c9b060f101b594104e1a667643b25f14902f8`:** [Node+Chromium](https://github.com/pin2map/pin2map-new-test/actions/runs/42987360761) erfolgreich, [Architektur](https://github.com/pin2map/pin2map-new-test/actions/runs/42987360727) erfolgreich, [Pages-/HTTPS-Preview](https://github.com/pin2map/pin2map-new-test/actions/runs/42987360733) erfolgreich. Die Preview-Assets wurden im Workflow real ausgeliefert und geprüft.
- **Manueller Gerätetest:** für diese UI-Abgrenzung nicht erforderlich, da echte Browser-Abbruchprüfung und vollständige CI-/Preview-Gates grün sind. Für künftige Bedienänderungen bei Bedarf ausdrücklich mit Testschritten anfordern.

## 4i. Fünfte `app.js`-Entflechtung – Pin-Editor-Eingabesteuerung (v107, 2026-11-11)

- Neues `ui/pin-editor-actions.js`: übernimmt ausschließlich die DOM-Listener für `pinName` (`input`/`blur`), `pinLayer` (`change`) und `showPinLayer` (`click`), mit injizierten Callbacks sowie `bind()`/`dispose()`. Keine Persistenz, Leaflet- oder Pin-/Ebenenregeln im UI-Modul.
- `app.js` behält `pinOps.renamePin`, `pinOps.assignLayer`, `filterOps.setLayerVisible`, `save()`, Notizen und erneutes Rendern. Alte direkte DOM-Bindings durch `pinEditorActions.bind()` ersetzt. **16.167 → 16.096 Zeichen**, bei klarerem Zuständigkeitsvertrag. `index.html` und `sw.js`-`CORE` um UI-Modul ergänzt, Quellversion **v107**.
- Neuer `tests/pin-editor-actions.test.js`: Raw-Input/Blur-Textbereinigung, Ebenewechsel, Ebene anzeigen, doppeltes Binden, `dispose`, App-/Script-/PWA-Vertrag. `tests/browser-smoke.cjs` erweitert: Pin-Namen bearbeiten, beim Blur trimmen und **gespeicherten Namen nach tatsächlichem Reload wiederfinden**. Bisherige Pin-Move-, Privat-Löschabbruch-, Basiskarten-, Offline-/Persistenztests bleiben grün.
- **Bestätigter finaler Test-Commit:** `283ac61fefea7fec03aafbad8eb956590f24d27a`. [Node + Chromium](https://github.com/pin2map/pin2map-new-test/actions/runs/42987990734) erfolgreich; [Architektur](https://github.com/pin2map/pin2map-new-test/actions/runs/42987990728) erfolgreich; [Pages/HTTPS und Live-Kartenstart](https://github.com/pin2map/pin2map-new-test/actions/runs/42987990743) erfolgreich.
- **Schutzbereiche:** Topo-Host `a.tile.opentopomap.org` unverändert, CSS weiter B38/298, Pins und IndexedDB-Schema sowie `main` und Referenzzweige nicht verändert.
- **Kein zusätzlicher manueller Gerätetest** für diese kleine Modulgrenzen-Änderung nötig; automatisches Chromium prüft Umbenennen und Speichern tatsächlich. Weiterhin ausdrücklich melden, wenn ein Gerätetest erforderlich wird.

## 4j. Sechste `app.js`-Entflechtung – Karten-Overlay-Koordination (v108, 2026-11-11)

- Neues zusammenhängendes UI-Modul `ui/map-overlay-coordinator.js` übernimmt das **Vorbereiten einer Pin-Auswahl**, das **Schließen aller Overlays**, **Ebenen-/Einstellungs-Panel-Wechsel**, `data-close`-Button-Bindings und das **Schließen von Suchtreffern beim Außenklick**. `bind()` ist idempotent; `dispose()` löst die eigenen Listener. Das Modul enthält weder Leaflet, IndexedDB noch Pin-/Ebenen-Mutationen.
- Die Anwendungssteuerung `app.js` besitzt weiterhin Auswahl-/Move-State, Move-Abbruch, Geschäftsregeln und Render-Aufrufe. Diese werden über injizierte Callbacks aufgerufen. Reihenfolge beim Schließen (Suche → Panels → Basiskarte → Mitteilung → offener Einzelpin-Dialog → Move-Abbruch → Selektion zurücksetzen → Fokus entfernen) sowie die Unterscheidung zwischen Pin-Auswahl und allgemeinem Schließen wurden absichtlich erhalten.
- `app.js` von **16.096 auf 15.442 Zeichen** verkürzt, zugleich mehrere verstreute direkt angebundene DOM-/Klick-Verantwortlichkeiten entfernt. `index.html` lädt das Modul vor `app.js`; `sw.js`-`CORE` enthält es in **v108**.
- Neuer `tests/map-overlay-coordinator.test.js`: Pin-Auswahl-Vorbereitung, Abbrechen im Move-Modus, sicheres Schließen des Löschdialogs, Rücksetzen der Auswahl, Panelwechsel, Außenklick, `data-close`, `bind`/`dispose` und App-Shell-Integration. `tests/browser-smoke.cjs` erweitert: Suchtreffer werden beim Klick auf die Karte geschlossen; danach bleibt der Suchdialog regulär benutzbar. Bestehende Pin-/Move-, Basiskarten-, Dialog-, Speicherung- und Offline-Tests grün.
- **Gates für finalen Test-Commit `bb8b4a9195e3e6c53fcb577b96d5d53e38ed5c3e` nachgewiesen:** [Node + Chromium](https://github.com/pin2map/pin2map-new-test/actions/runs/42988644999) erfolgreich, [Architektur](https://github.com/pin2map/pin2map-new-test/actions/runs/42988645024) erfolgreich, [Pages/HTTPS/Live-Start](https://github.com/pin2map/pin2map-new-test/actions/runs/42988644995) erfolgreich. GitHub-Quellversion `pin2map-new-v108` wird von der Preview-Pipeline als `pin2map-preview-v108` ausgeliefert.
- **Schutz:** CSS unverändert B38/298 `!important`, Topo-Host `a.tile.opentopomap.org`, Pin-/Ebenenschema, IndexedDB, `main` und Referenzzweige unverändert. **Für v108 kein zusätzlicher manueller Nutzergerätetest erforderlich**, da Browser-/Offline-/Overlay-Regression erfolgreich. Bei Bedarf weiterhin explizit anfordern.

## 4k. Siebte `app.js`-Entflechtung – Einzelpin-Löschdialog (v109, 2026-11-11)

- Neues `ui/pin-delete-dialog.js`: Präsentations- und Ereignislebenszyklus für den Einzelpin-Dialog, einschließlich sicherem `cancel`/Escape, `confirm`, idempotentem `bind` und `dispose`. Wichtig: Die beim **Öffnen** gewählte Pin-ID wird erfasst und bei späterer Bestätigung an die Anwendung zurückgegeben; kein unbeabsichtigtes Löschen eines inzwischen anders ausgewählten Pins.
- `app.js` übergibt `getSelectedPinId` und `onConfirm`-Callback; fachliche Löschung über `pinOps.deletePin(state,id)`, zustandsabhängige Selektion, Speicherung, Rendering und Bestätigungsmeldung bleiben außerhalb von `ui/`. Der alte direkte `deleteDialog`-`close`-Listener entfällt. `app.js` 15.442 → **15.433 Zeichen**; Hauptgewinn ist die klare Sicherheits-/UI-Grenze.
- `index.html` und `sw.js`-`CORE` enthalten das neue Modul; Service-Worker-Version **v109**. Neuer `tests/pin-delete-dialog.test.js` deckt gesicherte ID, Abbrechen, Mehrfachklick, fehlende Auswahl, Event-Lifecycle und Script-/Cache-Verträge ab.
- `tests/browser-smoke.cjs` prüft nach dem bisherigen Offline- und Pin-Persistenzlauf nun eine **wirkliche Einzelpin-Löschung**: Abbrechen erhält den Pin; Bestätigen entfernt ihn; nach erneutem **Offline-Neuladen** bleibt er gelöscht. Bestehende Karte, Suche, Ebenen, Basiskarte, Pin-Move, Löschabbruch und Offline-Funktionen weiterhin grün.
- **GitHub Actions tatsächlich erfolgreich (finaler Test-Commit `f0294eb24c789f04d8164a3561ecf527bbd5b71f`):** [Node und Chromium](https://github.com/pin2map/pin2map-new-test/actions/runs/42989242321), [Architektur](https://github.com/pin2map/pin2map-new-test/actions/runs/42989242227), [Pages/HTTPS-Preview und Live-Start](https://github.com/pin2map/pin2map-new-test/actions/runs/42989242295). Die Preview wird mit `pin2map-preview-v109` ausgeliefert.
- **Schutz:** Topo-Host `a.tile.opentopomap.org`, CSS B38 mit 298 `!important`, IndexedDB-Schema, Nutzerdaten und `main` nicht geändert. **Kein persönlicher Gerätetest erforderlich** für v109; tatsächlicher Chromium-Test einschließlich Datenpersistenz erfolgreich.

## 4l. Achte `app.js`-Entflechtung – Speicher-/Viewport-Koordination (v110, 2026-11-11)

- Neues Anwendungsmodul `application/project-persistence.js` übernimmt **debounced Save (300 ms)**, Schreiben über den injizierten Repository-Port, unmittelbares Schreiben beim PWA-Refresh, stillen Flush bei `visibilitychange=hidden` und die Übernahme des aktuellen Karten-Viewports nach `moveend`. Das Modul kennt **weder IndexedDB-API noch Leaflet, DOM oder Projekt-Datenbankschema**.
- `app.js` führt statt eigenem `saveTimer`/`dbWrite`/`save` eine `Pin2MapProjectPersistence`-Instanz und knappe Delegationscallbacks. `app.js` **15.433 → 15.269 Zeichen**; `index.html` und Offline-`CORE` laden neues Modul, Source-Cache **v110**. `adapters/storage/indexeddb-project-store.js` blieb unverändert: Datenbank `pin2map-new-v1`, Version 1, Store `kv`, Key `appState`.
- `tests/project-persistence.test.js` prüft Debounce, aktuelle Datenreferenz, Viewport-Daten, Immediate-Flush ohne doppelte Nachschreiboperation, fehlenden Repository-Port, Fehler-/Hidden-Verhalten sowie `dispose()`; `tests/check-architecture.mjs` überprüft nun den Repository-Port-Zugriff im neuen Anwendungsmodul statt historisch direkt in `app.js`.
- **Neuer echter Chromium-Regressionstest:** Karte verschieben, gespeicherten Viewport über den bereits vorhandenen Storage-Adapter lesen, nach Neuladen den erhaltenen Viewport vergleichen; Ergebnis im Browser-Log **`PASS – viewport moveend persistence and reload`**. Bestehende Browserfälle für Topografie, Pins, Benennung, Move, Löschen und Offline-Persistenz bleiben erfolgreich.
- **Verifiziert für finalen Code-/Test-Commit `8b8c1c179b92046bd87c3b082987d73bcc753fea`:** [Node/Chromium](https://github.com/pin2map/pin2map-new-test/actions/runs/42990198957) erfolgreich, [Architektur](https://github.com/pin2map/pin2map-new-test/actions/runs/42990198915) erfolgreich, [GitHub-Pages-/HTTPS-Preview](https://github.com/pin2map/pin2map-new-test/actions/runs/42990198868) erfolgreich. Die Preview veröffentlicht die Version `pin2map-preview-v110`.
- **Schutzbereiche unverändert:** `main` und Referenzen, persistierte Nutzerdaten, IndexedDB-Adapter/-Schema, CSS B38 mit 298 `!important`, Topografie `a.tile.opentopomap.org`. **Kein zusätzlicher persönlicher Test erforderlich** für v110; die betroffenen Speichervorgänge sind im realen Chromium-Lauf geprüft.

## 4. Beschlossener CSS-Zwischenstand und Verifikationslage

**CSS-Pause beschlossen am 2026-11-11; CSS bleibt auf Stand B38 mit 298 `!important`.** Der erste `app.js`-Entflechtungsschritt ist auf dem Feature-Branch umgesetzt; PWA-Quellrelease **v101**. CI/Pages-/automatisierte Kartenstart-/Offline-Smokes wurden später erfolgreich verifiziert; automatisierte Basiskarten-Menü-Regression wurde inzwischen separat im localhost-Chromium-Test bestanden; manuelle Geräteabnahme bleibt offen.

- `styles.css`: 947 Zeilen, rund 40 KB, **298 `!important`** (anfangs 402); 36 mehrfach vorkommende Selektoren in einer groben Quelltext-Inventur. Wiederholungen können berechtigte Media-Query-/Zustandsunterschiede sein und sind nicht automatisch Fehler. CSS bleibt technischer **Übergangszustand**, keine architektonisch abgeschlossene Komponentenkaskade.
- Letzte konkrete Bereinigung: **B38** (ursprüngliche doppelte `min-width:0` im Suchfeld), dokumentiert in `docs/CSS_SANIERUNG_ETAPPE_A_2026-11-10.md`. CSS, JavaScript, Worker und Datenmodell werden durch diese **Dokumentationsentscheidung nicht verändert**; CSS-Quellinhalt bleibt gleich; durch die neue App-Shell-Datei wird die SW-Quellkennung auf `pin2map-new-v101` angehoben.
- Geltender Schutzvertrag: keine neuen pauschalen `!important`-Overrides; CSS-Budget **298** nicht erhöhen; vorhandene Designtokens und Eigentümer respektieren; den abgenommenen Suchbutton (42px Antippfläche, 30px Sichtkreis, 18px Lupe) nicht beiläufig verändern.
- Bewusst **zurückgestellt**, nicht erledigt: umfassende CSS-Kaskadenkonsolidierung, konkurrierende Eigentümer, langfristige Aufteilung nach Komponenten, Stylelint-/AST-Infrastruktur und spätere Desktop-/iPad-/iPhone-CSS-Abnahme. **B39 wird nicht automatisch gestartet.**
- **Quelltext geprüft:** Feature-Branch `styles.css`, CSS-Architekturvertrag, Fahrplan, Projektstatus und Preview-Workflow wurden gelesen. Die Workflowdefinition führt u. a. `node --test tests/*.test.js` und `tests/check-*.mjs` vor einem geplanten Pages-Deploy aus; eine Konfiguration beweist keinen erfolgreichen Lauf.
- **CSS-Endabnahme weiterhin offen:** Die v101-CI-/Pages-Prüfungen sind nun bestätigt (siehe § 4a); dies ist **keine** vollständige CSS-Kaskaden-/Geräteabnahme. Eine reine Dokumentationsprüfung oder ältere gescheiterte Webzugriffe sind durch die belegten GitHub-Actions-/HTTPS-Ergebnisse überholt.
- **Schutzregel:** vor weiteren **Anwendungsänderungen** die technischen Gates nach Möglichkeit nachholen; fehlen die Belege weiterhin, ausdrücklich offen lassen und keine erfolgreich getestete/ausgelieferte Version behaupten. Nicht ungeprüft nach `main` übernehmen.

## 5. Nächste konkrete Schritte

1. **Nächste fachliche Verantwortlichkeit bewerten:** nach Speicherentflechtung die verbliebenen Pin-Erzeugungs-/Selektionsabläufe und weitere UI-Ereignisverdrahtung in `app.js` prüfen. Eine eigenständige, testbare Modulfunktion wählen, nicht bloß maximale Zeilenersparnis.
2. Vor weiterer Codeänderung aktuelle v110-Baseline und Architekturverträge erneut lesen; danach Node-, Architektur-, Chromium- und echte Pages-/HTTPS-Live-Gates bis zum endgültigen Ergebnis prüfen.
3. **Nutzergerätetests ausdrücklich anfordern**, wenn notwendig, mit konkreter Preview-URL und Prüfschritten. Für v110 ist kein Gerätetest erforderlich.
4. `main`, Referenzzweige, bestehende IndexedDB-Daten und Topo-Kachelquelle schützen; CSS-B38/298 bleibt pausiert.

## 6. Maßgebliche Dokumente

- `AGENTS.md` – verbindliche Einstiegs- und Arbeitsregeln.
- `docs/PROJEKTWEGWEISER.md` – Repositories, Branches, Umgebungen und Quellenhierarchie.
- `docs/GRUNDENTSCHEIDUNGEN.md` – Fachentscheidungen; neuere ausdrücklich beschlossene Präzisierungen beachten.
- `docs/MODULARCHITEKTUR.md` und `docs/ENTWICKLUNGSFAHRPLAN.md` – Modulgrenzen und Etappen.
- `docs/APP_JS_ENTFLECHTUNG_BESTAND_2026-11-11.md` – aktuelle `app.js`-Verantwortlichkeiten, Schnittstelle und erster UI-Extraktionsvorschlag.
- `docs/CSS_SANIERUNG_ETAPPE_A_2026-11-10.md` – vollständiger Verlauf der CSS-Inkremente.
- `docs/CSS_ARCHITEKTURREGELN.md` – aktive CSS-Eigentümer und Abnahmeregeln.
- `docs/DEVELOPMENT_PREVIEW_PAGES_2026-11-09.md` – Preview- und GitHub-Pages-Vertrag.
- `docs/VORGAENGER_APP_MODUL_AUDIT.md` – Bestandsaufnahme der Vorgängerfunktionen.

## 7. Dauerhafter Pflegevertrag

1. **Bei jedem größeren Arbeitsschritt** diesen Status mit Datum, aktuellem Stand, erreichtem Ergebnis, offenen Prüfungen und **genau nächster konkreter Aufgabe** aktualisieren.
2. **Bei kleineren Inkrementen** mindestens Version/Inkrement, Tests und Offenpunkte aktualisieren, falls sie die Fortsetzung beeinflussen; Details gehören weiterhin ins jeweilige Fachprotokoll.
3. Verbindliche neue Fachentscheidungen im dafür zuständigen Dokument festhalten und hier nur kurz mit Fundstelle referenzieren – **keine konkurrierende zweite Entscheidungssammlung**.
4. Nach jedem Commit die betroffenen GitHub-Dateien erneut lesen; publizierte Version und Workflowstatus gesondert prüfen.
5. Nach einem Chatwechsel genügt als Einstieg grundsätzlich: **„pin2map NEW – bitte nach docs/PROJEKTSTATUS.md im Feature-Branch fortsetzen.“** Die Ausführung beginnt mit einer frischen Repository-Prüfung.
