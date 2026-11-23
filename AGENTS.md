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
6. **Bei jeder GitHub-Änderung:** docs/ENTWICKLUNGSARBEITSABLAUF_2026-11-15.md (gebündelte Commits, schrittweise Gates, Umgang mit Schnittstellenlimits).
7. **Bei jeder Routing-Anforderung, Routing-Diskussion und Routing-Entwicklung:** docs/ROUTING_FUNKTIONALE_REFERENZ_UND_ANFORDERUNGEN.md (Vorgänger-Funktionsbefunde, offene Punkte, Entscheidungen und Fortsetzung über Chats). Eingereichte Nutzerwünsche dürfen ohne ausdrückliche Freigabe nicht als beschlossen oder implementiert gelten.

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

## Verbindliche Eskalations- und Lösungspflicht bei GitHub-Störungen (Nutzerbeschluss 23.11.2026)

**Vertrag:** Ein GitHub-Zugriffs-, API-, Connector-, Berechtigungs-, Branch-, Actions- oder Pages-Problem ist ein **eigenständig zu bearbeitender Störfall**, kein Freibrief für Abbruch oder ein bloßes Weiterreichen der Fehlermeldung. Der Auftraggeber muss nicht erneut auffordern, nach einer Alternative zu suchen. Diese Pflicht gilt in jedem Auftrag und nach jedem Chatwechsel und verschärft die vorstehende Regel „GitHub-Zugriff bei Ausfall wiederholt versuchen“.

**Verbindliche Vorgehensweise:**
1. Den konkreten Fehler samt betroffener Operation und verfügbarer Fehlermeldung erfassen; temporären Provider-/API-Fehler, fehlende Berechtigung, Tool-/Connector-Grenze, Branchkonflikt, fehlerhaften Workflow und echten Programm-/Testfehler voneinander unterscheiden. Keine fehlenden Runs mit grünen Runs gleichsetzen.
2. **Selbstständig mehrere begründete Wiederherstellungswege im selben Auftrag** prüfen: betroffene Operation kontrolliert wiederholen; Lese-/Schreibzugriff getrennt prüfen; alternative verfügbare GitHub-Aktionen/Endpunkte/Abfragewege verwenden; bei Workflow-Problemen Commit, Run-ID, Job/Schritt/Log über zugängliche Wege feststellen; bei Bedarf einen kleineren Aufrufblock oder eine zulässige isolierte Diagnose nutzen. Ein Connector-Limit ist kein nachgewiesenes GitHub-Limit.
3. Nach einem erfolglosen Versuch Diagnose und Vorgehen neu bewerten, statt identische Aufrufe endlos zu wiederholen oder unkontrollierte Code-/Workflow-Patches anzulegen. Den vorhandenen Schutzbranch, Datenbestand, Scope sowie die Stop-Regel einhalten.
4. Sobald der Zugriff wiederhergestellt ist, **den ursprünglich beauftragten Schritt ohne neue Nutzeraufforderung fortsetzen**, einschließlich erforderlicher Node-, Architektur-, Chromium-, WebKit-, Pages-, Service-Worker-, HTTPS- und Browser-Live-Gates. Ein Commit oder die bloße Verfügbarkeit einer URL beendet den Auftrag nicht.
5. Nur wenn nach konkreten, dokumentierbaren Alternativversuchen **innerhalb der tatsächlich verfügbaren Werkzeuge und Berechtigungen** keine weitere Lösung möglich ist, den exakten Blocker, die geprüften Lösungswege, die noch offenen Gates und den Zustand der Aufgabe ausdrücklich mitteilen. **Keine Fertigmeldung und kein stillschweigender Abbruch.** Eine unmögliche externe Entsperrung, zusätzliche Berechtigung oder zeitlich unbegrenzte Hintergrundüberwachung kann nicht zugesichert werden; bei unvermeidbarer Sperre bleibt die Aufgabe offen und wird beim nächsten Arbeitsauftrag anhand des Projektstatus wieder aufgenommen.

**Prozessverantwortung:** Fehlersuche, Nachweise, Neuversuche und zulässige Alternativen liegen beim Assistenten, nicht beim Auftraggeber. Der Nutzer wird nur dann eingebunden, wenn eine tatsächlich erforderliche Entscheidung, zusätzliche Berechtigung oder ein nicht selbst ausführbarer Schritt vorliegt. Diese Vereinbarung ist unabhängig vom jeweiligen Chat und gilt auch für isolierte UI-Prototypen und deren Veröffentlichung.

## Verbindliche GitHub-Arbeitsorganisation ab 15. November 2026

Die operative Regel steht vollständig in [docs/ENTWICKLUNGSARBEITSABLAUF_2026-11-15.md](docs/ENTWICKLUNGSARBEITSABLAUF_2026-11-15.md). Zusammengehörende Änderungen zuerst vollständig vorbereiten und prüfen, nach Möglichkeit **als einen zusammenhängenden Commit** mit atomarem Tree-/Commit-/Ref-Update auf dem Feature-Branch veröffentlichen. Ein Limit einzelner Connector-/Code-Mode-Ausführungen ist **kein** GitHub-Repository-Limit: Aufgaben in begrenzte Ausführungsblöcke teilen; zunächst lokale oder isolierte Prüfungen, dann Commit und vollständige CI-/HTTPS-Preview-Gates. GitHub-Ausfälle und echte Testfehler getrennt diagnostizieren. Bei notwendigem Zwischencommit die Ursache nennen und veraltete/abgebrochene Runs nicht als Beleg verwerten. Bei dokumentationsreinen Commits keine PWA-Version erhöhen und keine unangeforderte Preview auslösen. **Alle bisherigen Abschluss- und Schutzgates bleiben unverändert.**

## Bestandsschutz mit Vorschlagsrecht und vertragstreue Tests (21.11.2026)

Bestandsschutz gilt für abgenommene Funktionen, Dialoge und Layouts. Wenn eine bessere technische oder gestalterische Lösung sinnvoll erscheint, zunächst begründeten Vorschlag an den Nutzer richten; Umsetzung der Abweichung **nur nach ausdrücklicher Nutzerzustimmung**. Fehlerkorrekturen autorisieren keine Nebenänderungen. Testerwartungen müssen aus dem vorbestehenden Vertrag stammen und dürfen nicht nachträglich an unerlaubte UI-Änderungen angepasst werden. Für Layoutaussagen reale Browsergeometrie prüfen; echte iPhone-Safari-Abnahme von emulierten Tests unterscheiden. Kein Freigabeversprechen ohne entsprechenden Nachweis.

## Spezifische QS-Regel nach iPhone-Suchdialogfehler (21.11.2026)

Für UI-Fehler muss der beobachtete kaputte Zustand in einem Negativtest reproduzierbar scheitern; anschließend muss der Fix denselben Test bestehen. Echte Pixel-/Box-Geometrie, freie Viewport-Höhe und tatsächlich sichtbare letzte Option prüfen, nicht bloß DOM-Existenz oder Scrollbarkeit. Eine bereits durch `maxHeight` begrenzte Flex-Box darf ihre eigene `scrollHeight` nicht als Eingabe für ihre künftige Maximalhöhe benutzen. Mobile Browseremulation nie als reale iPhone-Safari-Prüfung ausgeben. Freigabe bei gegenteiligem Gerätetest zurücknehmen und Tests nachschärfen.

## Verbindliche Problemlösungsstrategie: Ursachenklärung statt Patch-Kaskaden (21.11.2026)

Bei Fehlern, insbesondere bei wiederholtem Fehlschlag oder einer Regression nach einem Fix, **nicht spekulativ mehrere kleine Änderungen nacheinander ausprobieren**. Stattdessen:

1. **Ist und Soll bestimmen:** Den tatsächlich beobachteten Fehler, den geltenden UI-/Funktionsvertrag und die messbaren Randbedingungen festhalten. Technische Vermutungen ausdrücklich als Hypothesen kennzeichnen, bis sie überprüft sind.
2. **Ursache prüfen und Komplexität reduzieren:** Zuständige Datenflüsse, Zustände, Koordinatensysteme und Abhängigkeiten nachvollziehen. Schlägt ein Korrekturversuch fehl, die bisherige Herangehensweise kritisch verwerfen, statt weitere symptomatische Patches daraufzustapeln.
3. **Bei Bedarf betroffene Lösung sauber neu aufbauen:** Eine einfache, nachvollziehbare, möglichst zustandsarme Implementierung des **eng begrenzten betroffenen Bereichs** einer Patch-Kaskade vorziehen. Nicht die gesamte Anwendung neu schreiben, wenn nur ein isolierter Teil betroffen ist. Keine unautorisierte Änderung an Layout, Verhalten oder Funktionen; für eine bessere abweichende Lösung zuerst den Nutzer fragen.
4. **Dann gezielt und unabhängig prüfen:** Zuerst reproduzierbaren Negativtest für den Originalfehler und die konkrete Ursache, danach positiven Vertrags-/Rendering-Test und bestehende Regressionen. Neue Tests dürfen die fehlerhafte Implementierung nicht zum Soll erklären.
5. **Freigabe nur auf Nachweis:** Node-, Architektur-, echte Browser-, HTTPS- und erforderliche WebKit-Gates abwarten; echte iOS-Geräteabnahme gesondert kennzeichnen. Gescheiterte oder unvollständige Gates nicht als Erfolg melden.

**Stop-Regel:** Nach einer fehlgeschlagenen Korrektur oder wiederholten Fehlversuchen keine weitere ad-hoc-Codeänderung, bevor Ursache, Vertragsgrenzen und gegebenenfalls Neuaufbauansatz erneut geprüft wurden. Diagnostik und Qualitätssicherung haben Vorrang vor schneller Commit-/Test-Wiederholung.
