# pin2map NEW – zentraler Projektstatus

**Stand:** 2026-11-11 · **Pflege:** bei jedem größeren Arbeitsschritt und bei jeder Änderung der nächsten Priorität.  
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

- **Quellversion:** **v100**, nach CSS-Inkrement **B38**. Quelle: `sw.js`, `const CACHE='pin2map-new-v100'`. Die zur Preview-Auslieferung gehörende Kennung wird im Workflow in `pin2map-preview-v100` umgeschrieben. Nicht mit einer tatsächlich überprüften installierten Version verwechseln.
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

## 4. Beschlossener CSS-Zwischenstand und Verifikationslage

**CSS-Pause beschlossen am 2026-11-11; Quellstand B38/v100 bleibt unverändert.** Die Istaufnahme von `app.js` am selben Tag hat noch keine Programmänderung ausgelöst.

- `styles.css`: 947 Zeilen, rund 40 KB, **298 `!important`** (anfangs 402); 36 mehrfach vorkommende Selektoren in einer groben Quelltext-Inventur. Wiederholungen können berechtigte Media-Query-/Zustandsunterschiede sein und sind nicht automatisch Fehler. CSS bleibt technischer **Übergangszustand**, keine architektonisch abgeschlossene Komponentenkaskade.
- Letzte konkrete Bereinigung: **B38** (ursprüngliche doppelte `min-width:0` im Suchfeld), dokumentiert in `docs/CSS_SANIERUNG_ETAPPE_A_2026-11-10.md`. CSS, JavaScript, Worker und Datenmodell werden durch diese **Dokumentationsentscheidung nicht verändert**; SW-Quellkennung bleibt `pin2map-new-v100`.
- Geltender Schutzvertrag: keine neuen pauschalen `!important`-Overrides; CSS-Budget **298** nicht erhöhen; vorhandene Designtokens und Eigentümer respektieren; den abgenommenen Suchbutton (42px Antippfläche, 30px Sichtkreis, 18px Lupe) nicht beiläufig verändern.
- Bewusst **zurückgestellt**, nicht erledigt: umfassende CSS-Kaskadenkonsolidierung, konkurrierende Eigentümer, langfristige Aufteilung nach Komponenten, Stylelint-/AST-Infrastruktur und spätere Desktop-/iPad-/iPhone-CSS-Abnahme. **B39 wird nicht automatisch gestartet.**
- **Quelltext geprüft:** Feature-Branch `styles.css`, CSS-Architekturvertrag, Fahrplan, Projektstatus und Preview-Workflow wurden gelesen. Die Workflowdefinition führt u. a. `node --test tests/*.test.js` und `tests/check-*.mjs` vor einem geplanten Pages-Deploy aus; eine Konfiguration beweist keinen erfolgreichen Lauf.
- **Unabhängig offen:** vollständiger Node-22-Testlauf gegen den vollständigen Branch, GitHub-Actions-Laufresultat des relevanten Pushes, veröffentlichte `/preview/`-Assets und SW v100 über HTTPS, Browser-Smoke und erneute Geräteabnahme. Der Container konnte `github.com` und `pin2map.github.io` nicht per DNS auflösen; die Web-Abrufe waren nicht erfolgreich. Verfügbare Commit-Status-/PR-Workflow-Quellen haben für die bisherigen Commits keine belastbaren Push-Run-Ergebnisse geliefert.
- **Schutzregel:** vor weiteren **Anwendungsänderungen** die technischen Gates nach Möglichkeit nachholen; fehlen die Belege weiterhin, ausdrücklich offen lassen und keine erfolgreich getestete/ausgelieferte Version behaupten. Nicht ungeprüft nach `main` übernehmen.

## 5. Nächste konkrete Schritte

1. **Qualitäts-Baseline v100 nachweisen:** vollständiges `node --test tests/*.test.js` und `tests/check-*.mjs` auf dem Feature-Branch, GitHub Actions/Pages prüfen, HTTPS-Dateien und echten Browser-Smoke verifizieren; fehlende Nachweise als blockiert/offen markieren. Keine Daten oder `main` ändern.
2. **`app.js`-Entflechtung vorbereitet (2026-11-11):** Iststand und vorhandene Module in `docs/APP_JS_ENTFLECHTUNG_BESTAND_2026-11-11.md` inventarisiert. Als erste kleine Extraktion ist das **Basiskarten-Menü** in ein reines `ui/basemap-menu.js` vorgesehen. Vorerst keine Programm-/CSS-Änderung.
3. Basiskarten-Menü aus `app.js` herauslösen (nur UI/ARIA/Interaktion; Karte, Projektzustand und Speichern bleiben außerhalb des UI-Moduls), mit gezieltem DOM-Unit-/Integrations-/Browser-Test und verifizierter Preview-Freigabe.
4. CSS-Komplettsanierung später wieder aufnehmen, wenn Änderungen konkrete Kaskadenprobleme offenbaren oder die Architektur-/UI-Abnahme ansteht. B39 bleibt bis dahin **pausiert**.

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
