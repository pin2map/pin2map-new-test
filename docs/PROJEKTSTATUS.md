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

- **Quellversion:** **v99**, nach CSS-Inkrement **B37**. Quelle: `sw.js`, `const CACHE='pin2map-new-v99'`. Die zur Preview-Auslieferung gehörende Kennung wird im Workflow in `pin2map-preview-v99` umgeschrieben. Nicht mit einer tatsächlich überprüften installierten Version verwechseln.
- **CSS-Sanierung:** Anfang **402** `!important`-Vorkommen, derzeit **298**. B37 entfernte das überholte `width:100%` im ursprünglichen `.search input`; die späteren Flex-/Breiten-Eigentümer bleiben gültig.
- **Sanierungsprotokoll:** `docs/CSS_SANIERUNG_ETAPPE_A_2026-11-10.md`; alle Schritte B1–B37 sind dort erläutert.
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

**B37 – v99 (2026-11-11):**
- `styles.css`: altes `width:100%` in ursprünglicher `.search input`-Regel entfernt; spätere `width:0`- und Flex-Eigentümer unverändert.
- `tests/css-search-input-base-width-ownership.test.js`: neuer Regressionstest für ursprüngliche Eingabefeld-Eigenschaften, spätere Breiten-/Flex-Steuerung und 16px-/Padding-Vertrag.
- `sw.js`: Quellversion v98 → v99; `!important` unverändert 298.
- `docs/CSS_SANIERUNG_ETAPPE_A_2026-11-10.md`: B37 protokolliert.
- **Statisch geprüft:** einmalige Zielstelle, spätere gültige Regeln und Testmuster anhand GitHub-Quelltext. Nach Commit Dateien erneut prüfen.
- **Unabhängig offen:** volle Node-Testsuite plus `tests/check-*.mjs`, erfolgreicher GitHub-Actions-/Pages-Lauf, öffentliche HTTPS-Auslieferung v99 und Browser-Smoke. Kein neuer Gerätetest nötig, weil nur eine überholte Normaldeklaration entfiel.

## 5. Nächste konkrete Schritte

1. **B38:** nächste eindeutig überschriebene CSS-Deklaration anhand des Feature-Branch-Iststands und der vorhandenen CSS-Tests identifizieren.
2. Klein und gezielt entfernen, Regressionstest und Dokumentation aktualisieren, bei CSS-Änderung PWA-Quellversion fortschreiben.
3. Unabhängige Node-/Actions-/Pages-/Live-Gates nach Möglichkeit tatsächlich prüfen; andernfalls weiter ausdrücklich offen halten.
4. Nach Abschluss der CSS-Abnahme die `app.js`-Modularisierung beginnen.

**Noch offen:** Komponenteneigentümer vollständig klären, Stylelint-/AST-Kontrollen und unabhängige Desktop-/Tablet-/Browserregressionen.

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
