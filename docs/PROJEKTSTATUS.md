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

- **Quellversion:** **v93**, nach CSS-Inkrement **B31**. Quelle: `sw.js`, `const CACHE='pin2map-new-v93'`. Die zur Preview-Auslieferung gehörende Kennung wird im Workflow in `pin2map-preview-v93` umgeschrieben. Nicht mit einer tatsächlich überprüften installierten Version verwechseln.
- **CSS-Sanierung:** Anfang **402** `!important`-Vorkommen, derzeit **298**. B31 entfernte nur einen überholten mobilen `.topbar{display:flex}`-Block; das stärkere `display:flex!important` bleibt gültig.
- **Sanierungsprotokoll:** `docs/CSS_SANIERUNG_ETAPPE_A_2026-11-10.md`; alle Schritte B1–B31 sind dort erläutert.
- **CSS-Regelvertrag:** `docs/CSS_ARCHITEKTURREGELN.md`; temporärer Grenzwert in `tests/css-debt-budget.test.js` ist 298.
- **Besonders geschützter Suchbutton:** 42px Antippfläche, 30px sichtbarer Ring, 18px Lupe. Kein unbeabsichtigtes Umgestalten von Kreis, Suchkapsel oder Ausrichtung.
- **Technische Bausteine:** Leaflet-Karte, Pin-/Ebenenverwaltung, IndexedDB-Persistenz, Suche, UI-Module, Service Worker und Offline-App-Shell; maßgeblichen tatsächlichen Implementierungsstand in den jeweiligen Dateien prüfen, nicht allein aus dieser Kurzliste ableiten.
- **Architekturphase:** Erst CSS-Kaskaden und Zuständigkeiten konsolidieren und abnehmen, **danach `app.js` strukturell überarbeiten**. Keine gleichzeitige große Umstellung von CSS und App-Steuerung.

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

## 4. Letztes Inkrement und Nachweisstand

**B31 – v93 (2026-11-11):**
- `styles.css`: redundante `display:flex`-Regel in einer alten mobilen `@media(max-width:630px)`-Stufe entfernt; übrige Media-Query-Inhalte erhalten.
- `tests/css-mobile-header-display-ownership.test.js`: neuer Test für den wirksamen Flex-Eigentümer und benachbarte mobile Regeln.
- `sw.js`: Quellversion v92 → v93.
- `docs/CSS_SANIERUNG_ETAPPE_A_2026-11-10.md`: B31 protokolliert.
- **Gezielt verifiziert:** Vier aktualisierte Dateien erneut aus GitHub gelesen und acht Quelltext-Invarianten geprüft; darunter 298 `!important`, alter Block entfernt, Endregel vorhanden, mobile Nachbarregeln vorhanden, SW v93 und Dokumentation.
- **Nicht als bestanden nachgewiesen:** vollständiger `node --test tests/*.test.js`-Lauf, `tests/check-*.mjs`, erfolgreicher Push-Workflow, exakte HTTPS-Pages-Auslieferung und Live-Browser-Smoke-Test. GitHub-Commit-Statusabfrage lieferte keine Statuschecks; die verfügbare Workflow-Abfrage erfasst nur PR-Runs und kann den Push-Deploy nicht bestätigen.
- **Nutzer-Gerätetest:** für die rein interne B31-Bereinigung nicht angefordert.

## 5. Nächste konkrete Schritte

1. **B32:** einen weiteren kleinen überholten CSS-Block anhand der *tatsächlichen* Kaskade identifizieren; vor dem Eingriff CSS und betroffene Tests erneut aus dem Feature-Branch lesen.
2. Nur eindeutig überschattete Deklarationen entfernen; einen gezielten Regressionstest ergänzen und vorhandene Tests auf veraltete Erwartungen überprüfen.
3. Änderungen auf `feature/leaflet-modular-core` speichern, CSS-Budget/Protokoll/Quellversion nur nach Bedarf aktualisieren.
4. Tests und Veröffentlichung nach Möglichkeit tatsächlich nachweisen; fehlende CI-/Pages-/Live-Gates als offen stehen lassen, nicht als Erfolg deklarieren.
5. Nach Abschluss der CSS-Sanierung die geplante `app.js`-Modularisierung anhand des Architekturvertrags aufnehmen.

**Weitere offene Aufgaben:** Abschluss der CSS-Komponentenverantwortlichkeiten, unabhängige Preview-/Desktop-/Tablet-Regressionen, CSS-Lint-/AST-Qualitätsschutz und anschließende `app.js`-Entflechtung. Keine pauschale CSS-Fertigstellung allein aufgrund der Zahl 298.

## 6. Maßgebliche Dokumente

- `AGENTS.md` – verbindliche Einstiegs- und Arbeitsregeln.
- `docs/PROJEKTWEGWEISER.md` – Repositories, Branches, Umgebungen und Quellenhierarchie.
- `docs/GRUNDENTSCHEIDUNGEN.md` – Fachentscheidungen; neuere ausdrücklich beschlossene Präzisierungen beachten.
- `docs/MODULARCHITEKTUR.md` und `docs/ENTWICKLUNGSFAHRPLAN.md` – Modulgrenzen und Etappen.
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
