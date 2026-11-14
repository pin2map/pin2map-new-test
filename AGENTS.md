# pin2map NEW – verbindlicher Einstieg für neue Arbeitsaufträge

**Aktuelle Entwicklung:** pin2map/pin2map-new-test, feature/leaflet-modular-core.  
**Aktueller Arbeitsstand und Chatwechsel-Einstieg:** docs/PROJEKTSTATUS.md.  
**Zentraler Wegweiser:** docs/PROJEKTWEGWEISER.md.

Bei einem neuen pin2map-NEW-Auftrag bitte **ohne Rückfrage** zunächst folgende Quellen in dieser Reihenfolge lesen:
1. docs/PROJEKTSTATUS.md (Version, zuletzt bearbeitetes Inkrement, offene Gates, nächster Schritt)
2. docs/PROJEKTWEGWEISER.md (aktuelle Repositories, Umgebungen, Prioritäten)
3. docs/GRUNDENTSCHEIDUNGEN.md (fachliche Entscheidungen; Qualitäts- und Abschlussregel 2026-11-10)
4. docs/MODULARCHITEKTUR.md und docs/ENTWICKLUNGSFAHRPLAN.md
5. Bei Deployment/Preview: docs/DEVELOPMENT_PREVIEW_PAGES_2026-11-09.md; bei UI/Refresh: docs/UI_CONTROLS_AND_PWA_REFRESH_2026-11-10.md.

## Unverhandelbare Arbeitsvereinbarung vom 10. November 2026

Bei **jedem** vom Nutzer beauftragten pin2map-NEW-Implementierungsschritt führt der Assistent den Auftrag eigenständig **bis zur überprüfbar veröffentlichten Preview-Version** durch. Eine bloße Konzept-/Diff-Antwort ist kein Ersatz, solange der im aktuellen Auftrag verfügbare GitHub-Zugriff funktioniert. Die konkrete Abschlusskontrolle lautet:

1. Anforderung prüfen, Quellstand und Schutzbranch feststellen; Implementierung vollständig ausführen.
2. Modul-/Node-, Architektur- und tatsächliche Chromium-Browsertests ausführen und Fehlermeldungen **im selben Auftrag** beheben; Tests nicht abschwächen, nur um sie grün zu bekommen.
3. Isolierte GitHub-Pages-Preview veröffentlichen; den grünen Deploy-Gate samt live ausgelieferter Worker-Version und relevanten Assets sowie Live-Browserprüfung belegen.
4. Verbindliche Entscheidungen und Testnachweise in den bestehenden Projektstatus schreiben.
5. **Erst danach** eine Fertigmeldung mit Commit, Run-Links, Versionsnummer und Preview-URL senden. Fehlende Gates ausdrücklich offen lassen; ein laufender/fehlgeschlagener Workflow ist kein Erfolg.
6. Nach einem Chatwechsel das Projektstatus-Dokument lesen und begonnene Arbeit fortsetzen. Eine Behauptung fehlender Repo-Berechtigung erst nach tatsächlicher Prüfung der verfügbaren GitHub-Integration und erneuten Versuchen.

Diese Vereinbarung ist im Repository dokumentiert und gilt unabhängig von einer persönlichen ChatGPT-Memory-Einstellung. Sie ergänzt die bereits bestehende Arbeitsregel in `docs/GRUNDENTSCHEIDUNGEN.md` vom 2026-11-10.

## Bindende Umsetzungsregeln

- UI und Fachlogik modular entwickeln, keine Rückkehr zur historischen Ein-Datei-Pflicht.
- Vorgänger-App ist funktionale/visuelle Referenz; UI-PoC ist Design-Referenz, kein Quellcode für pin2map NEW.
- Main, Datenbestände und reference/*-Branches nicht ohne ausdrückliche Freigabe verändern. Aktuelle Änderungen auf feature/leaflet-modular-core und isolierter /preview/-Umgebung.
- **Nicht nach dem Commit aufhören:** Anwendungsänderungen umfassen Implementieren, automatisierte/Browser-Regressionstests, erfolgreiches Veröffentlichen und Nachprüfen der ausgelieferten Version auf der echten Preview-URL. Testresultate, Versionskennung, Commit und Link nachweisen. Wenn das nicht möglich ist, den Auftrag als **offen** benennen und keine Fertigmeldung behaupten.
- Tatsächliche iPhone-Gesten ohne entsprechenden realen Test nicht als auf iPhone geprüft bezeichnen.
- Vereinbarte Entscheidungen dauerhaft in den vorhandenen maßgeblichen Dokumenten statt als konkurrierende verstreute Kopien festhalten.
- **GitHub-Zugriff bei Ausfall wiederholt versuchen:** Wenn Repository-, Branch-, Lese-/Schreib- oder GitHub-Actions-Zugriffe vorübergehend fehlschlagen, nicht beim ersten Fehler aufgeben und nicht sofort auf bloße Diff-Beschreibungen oder einen neuen Chat ausweichen. Den Zugriff im laufenden Auftrag mehrfach erneut prüfen, auch nach einer kurzen Unterbrechung bzw. über alternative verfügbare GitHub-Zugriffswege; bei wiederhergestelltem Zugriff die beauftragte Umsetzung und Verifikation fortsetzen. Nur wenn wiederholte Versuche innerhalb des aktuellen Arbeitslaufs nachweislich erfolglos bleiben, die konkrete Blockade und den nicht erledigten Status ehrlich melden. Niemals eine nicht nachgewiesene Veröffentlichung behaupten.
