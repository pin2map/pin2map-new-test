# pin2map NEW – verbindlicher Entwicklungs- und GitHub-Arbeitsablauf

**Beschlossen:** 2026-11-15 · **Geltung:** Alle weiteren pin2map-NEW-Entwicklungs-, Test-, Dokumentations- und Veröffentlichungsaufträge auf `pin2map/pin2map-new-test`, `feature/leaflet-modular-core`.

**Vorrang und Schutz:** Dieser Vertrag ergänzt `AGENTS.md`, `docs/GRUNDENTSCHEIDUNGEN.md` und `docs/DEVELOPMENT_PREVIEW_PAGES_2026-11-09.md`; er ersetzt **nicht** den Grundsatz „erst implementiert, erfolgreich getestet, veröffentlicht und live überprüft = fertig“. `main`, `reference/*`, IndexedDB, Nutzerdaten und bisherige PWA-Caches bleiben ohne Freigabe geschützt. Keine Änderung der Produkt- oder Modularchitektur.

## 1. Ausgangsbefund und Abgrenzung

Bei v190 schlug **ein Code-Mode-Ausführungsschritt** wegen `Code Mode exceeded the maximum number of tool calls` fehl. Dies ist eine Begrenzung eines einzelnen Werkzeug-Orchestrierungsschritts, **keine nachgewiesene Grenze für GitHub-Commits, Repositorygröße oder den GitHub-Account**. Beim anschließenden dateiweisen Einchecken starteten zahlreiche CI-/Preview-Läufe; alte Deploy-Runs wurden durch die vorhandene `cancel-in-progress`-Regel abgebrochen. Außerdem traten **eigenständige** GPS-Browser-/Persistenz-Testfehler auf, die nichts mit der Werkzeugaufrufgrenze bewiesen. Diese Fälle künftig strikt unterscheiden.

## 2. Vorbereitung vor GitHub-Schreibzugriff

1. Zu Beginn aktuellen Branch-Head, maßgebliche Verträge und zuletzt geänderte Quelldateien direkt im Repository prüfen; nicht von einer früheren Chat-Zusammenfassung ausgehen.
2. Den Auftrag in **kleine fachlich sinnvoll getrennte, ausführbare Inkremente** gliedern und die betroffenen Ports, Daten-/Offline-Verträge, Tests und einen Rückweg identifizieren.
3. Alle zu einem Inkrement gehörenden Code-/Test-/Asset-/SW-Dateien **möglichst vor dem ersten Push** vorbereiten. Soweit verfügbar, Syntax, Modul- und fokussierte Regressionstests auf der vorbereiteten Gesamtänderung ausführen; Tests dürfen nicht nur zur Grünfärbung entschärft werden.
4. Nutzerabnahmen und nachweisbare maschinelle Gates separat planen; keine weiteren Rückfragen bei bereits beschlossenen Anforderungen.

## 3. Änderungen bündeln und atomar übertragen

1. **Standard:** Ein inhaltlich zusammengehörendes, getestetes Inkrement wird möglichst als **ein Commit** übertragen, statt jeder Datei einen eigenen Commit zu geben. Dafür nach Möglichkeit Git-Blobs und einen Tree auf dem geprüften Basis-Tree erzeugen, einen Commit mit dessen aktuellem Eltern-SHA erstellen und den Feature-Ref mit erwarteter Ausgangs-SHA (optimistische Konkurrenzkontrolle, keine erzwungene Überschreibung) fortschreiben. Alternativ Git-CLI für einen lokalen zusammenhängenden Commit nutzen, wenn tatsächlich verfügbar.
2. **Keine riskante Einmal-Orchestrierung:** GitHub-Aufrufe in begrenzten Blöcken durchführen. Große Dateien/Anzahlen in kontrollierten Blöcken vorbereiten; Transaktionen erst nach vollständiger Vorbereitung abschließen. Werkzeuglimit pro Ausführungsschritt ist nicht durch blindes Wiederholen eines übergroßen Aufrufs zu umgehen.
3. **Konfliktfall:** Vor jedem Ref-Update Branch-Head erneut bestätigen; hat sich der Head verändert, Änderungen gegen den neuen Stand prüfen und nicht mit Force-Push über fremde Änderungen schreiben.
4. **Ausnahmen:** Kleinere, begründete Zwischencommits sind zulässig bei dringendem Hotfix, tatsächlicher Blockade, einem unabhängigen sauberen Teilinkrement oder einer nach einer echten CI-Diagnose nötigen Korrektur. Nicht funktionierende Zwischenstände nicht als freigegebene Version deklarieren. Ein Test-/Fix-Commit soll den konkreten Befund nennen. Fehlgeschlagene/abgebrochene Runs nie als erfolgreiche Abnahme verbuchen.

## 4. Tests und Veröffentlichung in Stufen

1. **Vorprüfung:** Syntax, betroffene Unit-/Node-Verträge, gezielte Browser-Smokes und ggf. Architektur-/CSS-Verträge prüfen, soweit in der Umgebung ausführbar. Wenn das nur in CI möglich ist, ausdrücklich als zunächst offen markieren.
2. **Integrationsgate:** Nach einem konsistenten Feature-Commit GitHub-Actions-Node- und Chromium-Regressionslauf **für den exakten Commit** verfolgen; Fehlermeldungen am tatsächlichen Job-Log diagnostizieren. Fremdprovider-/Flaky-/Testannahmen-Probleme getrennt von echten App-Fehlern bewerten. Keine nicht belegte grüne Aussage.
3. **Architekturgate:** Modulgrenzen, Datenhaltung und bestehende Regressionstests für den identischen Funktionsstand bestehen lassen.
4. **Veröffentlichungsgate:** Pages-Preview mit isolierter Datenhaltung erfolgreich deployen; anschließend **HTTPS-Live-Auslieferung der erwarteten Worker-Version und Assets** sowie konkrete Browserinteraktion auf der veröffentlichten Preview bestätigen. Ein gestarteter, grüner Teiljob oder GitHub-Commit genügt nicht.
5. **Gerätegate:** Automatisierte iPhone-/iPad-Emulation als solche kennzeichnen, reale Safari-/GPS-/Touchabnahmen nur bei tatsächlicher manueller Prüfung als bestanden melden.
6. **Korrekturschleife:** Wenn CI scheitert, zuerst Logs und Ursache feststellen, gezielt korrigieren und dann die vom Fix betroffenen bzw. vorgeschriebenen Gesamttests erneut laufen lassen; vermeidbare zusätzliche Commits und neue Workflow-Kaskaden verhindern.

**Wichtig:** `.github/workflows/preview-pages.yml` deployt aus dem Feature-Branch und startet bei anwendungs- beziehungsweise workflowrelevanten Pushes; `concurrency.cancel-in-progress` kann vorherige Läufe abbrechen. **Präzisierung vom 2026-11-15:** Die `paths-ignore`-Regel umfasst nun ausdrücklich `docs/**` **und `AGENTS.md`**, damit reine Dokumentations- und Arbeitsanweisungs-Commits keinen Pages-Deploy auslösen. Das war nötig, weil ein anfänglicher Dokumentations-Commit mit geänderter `AGENTS.md` trotz `docs/**`-Ausschluss einen Deploy anstieß. Ein Commit, der zugleich Anwendungs- oder Workflowdateien ändert, bleibt deploypflichtig. Diese punktuelle Trigger-Korrektur verändert keinen Test- oder Freigabeschritt; zukünftige Pipeline-Änderungen benötigen weiterhin eine eigene Begründung. Nicht allein wegen geringer Kosten die Pflicht-Tests überspringen.

## 5. Dokumentation, Freigabe und Chatwechsel

- In `docs/PROJEKTSTATUS.md` pro abgeschlossenem Inkrement: Version, maßgeblicher Funktionscommit, tatsächliche Test- und Deploy-Run-Links, konkret verifizierte Live-Funktion, offene Geräteprüfungen und neue verbindliche Regeln festhalten.
- Produkt-/UX-Entscheidungen in zuständigen Fachverträgen dokumentieren; keine mehrfachen, widersprüchlichen Regelsammlungen anlegen. Dieses Dokument ist allein der operative **Arbeitsablaufvertrag**, keine neue fachliche Architektur.
- **Reine Dokumentation**: keine künstliche App-/Cache-Versionserhöhung, keine unbeauftragten PWA-Dateiänderungen oder Preview-Neuveröffentlichung; automatisch ausgelöste Node-/Architekturprüfungen nur als zusätzliche Information kennzeichnen.
- Nach Chatwechsel auf aktuellem Feature-Branch `AGENTS.md`, `docs/PROJEKTSTATUS.md` und diesen Ablauf lesen. Auftrag wird weiterhin im aktuellen Arbeitsgang so weit wie möglich vollständig ausgeführt; technische Hindernisse konkret benennen, nicht als stillschweigend erledigt ausgeben.

## 6. Mindestabschlussbericht

- **Implementiert:** kurz die tatsächlichen Änderungen und Versionskennung.
- **Git:** Commit-SHA, unveränderte Schutzbranches, ggf. begründete Zwischencommits.
- **Verifiziert:** getrennt lokale/CI-/Architektur-/HTTPS-/Browser-/reale Geräteprüfungen mit tatsächlichen Nachweisen.
- **Offen:** alles, was nicht nachweisbar abgeschlossen ist. Bei reinem Dokumentationsauftrag nur Dokumentspeicherort, Commit und Dokumentationsstatus; keinen App-Deploy als nötig behaupten.

**Ziel:** Weniger redundante GitHub-Actions-Läufe und eine verständlichere Git-Historie bei unverändert strengen Qualitäts- und Sicherheitsgates.
