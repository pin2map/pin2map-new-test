# pin2map NEW – verbindlicher Einstieg für neue Arbeitsaufträge

**Aktuelle Entwicklung:** pin2map/pin2map-new-test, feature/leaflet-modular-core.  
**Aktueller Arbeitsstand und Chatwechsel-Einstieg:** docs/PROJEKTSTATUS.md.  
**Zentraler Wegweiser:** docs/PROJEKTWEGWEISER.md.

Bei einem neuen pin2map-NEW-Auftrag bitte **ohne Rückfrage** zunächst folgende Quellen in dieser Reihenfolge lesen:
1. docs/PROJEKTSTATUS.md (Version, zuletzt bearbeitetes Inkrement, offene Gates, nächster Schritt)\n2. docs/PROJEKTWEGWEISER.md (aktuelle Repositories, Umgebungen, Prioritäten)
3. docs/GRUNDENTSCHEIDUNGEN.md (fachliche Entscheidungen; Qualitäts- und Abschlussregel 2026-11-10)
4. docs/MODULARCHITEKTUR.md und docs/ENTWICKLUNGSFAHRPLAN.md
5. Bei Deployment/Preview: docs/DEVELOPMENT_PREVIEW_PAGES_2026-11-09.md; bei UI/Refresh: docs/UI_CONTROLS_AND_PWA_REFRESH_2026-11-10.md.

## Bindende Umsetzungsregeln

- UI und Fachlogik modular entwickeln, keine Rückkehr zur historischen Ein-Datei-Pflicht.
- Vorgänger-App ist funktionale/visuelle Referenz; UI-PoC ist Design-Referenz, kein Quellcode für pin2map NEW.
- Main, Datenbestände und reference/*-Branches nicht ohne ausdrückliche Freigabe verändern. Aktuelle Änderungen auf feature/leaflet-modular-core und isolierter /preview/-Umgebung.
- **Nicht nach dem Commit aufhören:** Anwendungsänderungen umfassen Implementieren, automatisierte/Browser-Regressionstests, erfolgreiches Veröffentlichen und Nachprüfen der ausgelieferten Version auf der echten Preview-URL. Testresultate, Versionskennung, Commit und Link nachweisen. Wenn das nicht möglich ist, den Auftrag als **offen** benennen und keine Fertigmeldung behaupten.
- Tatsächliche iPhone-Gesten ohne entsprechenden realen Test nicht als auf iPhone geprüft bezeichnen.
- Vereinbarte Entscheidungen dauerhaft in den vorhandenen maßgeblichen Dokumenten statt als konkurrierende verstreute Kopien festhalten.
