# CSS-Sanierung – Etappe A: Bestandsaufnahme und Referenzvertrag

**Stand:** 2026-11-10 · **Branch:** `feature/leaflet-modular-core` · **Status:** Quellcodeinventur gesichert; Live-Browser-/iPhone-Referenz ist ausdrücklich noch offen.

## Ziel und verbindliche Reihenfolge

Die existierende Darstellung soll **nicht neu gestaltet** werden. Wir beseitigen systematisch CSS-Kaskadenprobleme und dokumentieren eindeutige Zuständigkeiten. Kein bloßes Verschieben sämtlicher alter Regeln in mehrere Dateien. Erst nach belastbarer CSS-Basis folgt als zweites Architekturthema die Bereinigung der zentralen Anwendungssteuerung `app.js`.

1. **A – Inventur und verifizierbare Referenz:** bestehende Selektoren, Media Queries, Überschreibungen, JavaScript-Inlinestyles, Kontrollpositionen und Nutzerabläufe erfassen; mobiles und Desktop-Live-Verhalten dokumentieren.
2. **B – CSS-Vertrag und Tokens:** klares Ownership pro Komponente, globale Variablen und wenige begründete Ausnahmen. Zuerst Kartenbuttons, Kopf-/Suchleiste, Safe Areas.
3. **C – Komponentenmigration:** Suche, Menüs, Panels und Pin-Dialog in kleinen getesteten Schritten; dynamische Pin-Geometrie unverändert erhalten.
4. **D – Marker/Labels sowie restliche Darstellung:** alte Regeln durch die neuen Verantwortlichkeiten ersetzen.
5. **E – Alt-CSS entfernen:** keine konkurrierenden, per Dateireihenfolge kaschierten Regeln stehen lassen.
6. **F – Architekturschutz:** Stylelint/AST-Prüfungen, definierte Ausnahmen, CI-Regeln, tatsächliche Browser-Geometrie- und mobile Regressionstests.

**Gate je App-Änderung:** Syntax-/Modultests + Browser-Regression + nachgewiesen erfolgreiche Preview-Veröffentlichung + Prüfung der **ausgelieferten** Version und geänderten Funktion. Keine Fertigmeldung allein nach einem Commit. Stabiler `main`, Daten und `reference/*` bleiben unangetastet.

## Quellcodeinventur (Messstand vor der Sanierung)

Die aktive Entwicklung lädt **eine** eigene `styles.css` sowie die externe Leaflet-CSS aus `index.html`. Einzelne isolierte Kartenexperimente sind **nicht** Teil der aktiven HTML-Startseite.

| Merkmal | Befund |
|---|---:|
| `styles.css` | 999 Zeilen, 48.103 Zeichen |
| `!important` | 402 Vorkommen |
| `@media` | 16 Vorkommen |
| `.topbar{` | 5 wörtliche Regelanfänge (zuzüglich spezifischer Varianten) |
| `.search-results` | mehrfach in der Kaskade definiert |
| `.panel` | mehrfach in der Kaskade definiert |
| `#layersButton` | 8 Erwähnungen |
| `#layersPanel` | 4 Erwähnungen |
| `#map{` | 6 wörtliche Erwähnungen |

Die Zahlen basieren auf einer reproduzierbaren **Textinventur** und sind weder eine syntaktische CSS-AST-Auswertung noch der Nachweis, dass jede Wiederholung ein Fehler ist. Media-Query-spezifische Überschreibungen können legitim sein; kollidierende aktive Deklarationen müssen später pro Viewport nach der echten CSS-Kaskade geprüft werden. `!important` allein ist kein Fehlerbeweis, ist in dieser Konzentration jedoch ein klarer Wartungsrisiko-Indikator.

Ausführung der Inventur: `node tests/css-inventory.cjs`. Dieses Skript liest nur Dateien; es ändert weder Anwendung noch Styles.

## Bekannte Kaskadenrisiken

- Die Steuerung der `topbar`, Suche und Panels ist über ältere und neuere Styleabschnitte verteilt. Frühere mobile Grid-Regeln und spätere Flex-/Overlay-Regeln koexistieren.
- Die früher unten zentrierte Ebenensteuerung wurde später über spezifischere Selektoren rechts oben platziert; vorhandene Unterseiten-Positionierungen sind weiter im Stylesheet.
- Gemeinsame 42-px-Buttons und die Safe-Area-Baseline sind eingeführt, aber noch nicht vollständig an einer eindeutigen Stelle konsolidiert.
- `!important` und die Kaskadenreihenfolge dienen stellenweise als unbeabsichtigte Architekturgrenze.
- Größere Layoutänderungen lassen sich derzeit nicht durch ausschließlich lokale Komponentenregeln vornehmen.

## Dynamische Geometrie: **nicht** als Alt-CSS löschen

- `ui/pin-panel-positioner.js` setzt per Inline-Styles die dynamischen Pixelkoordinaten und die Breite des Pin-Dialogs/der Dialogspitze.
- `ui/pin-move-preview.js` positioniert die Bestätigungsleiste beim Verschieben.
- `ui/layer-view.js` und `ui/pin-layer-picker.js` setzen individuelle Ebenenfarben.
- `app.js` setzt den Karten-Cursor abhängig vom Verschiebemodus.

Diese Zuweisungen sind teils fachlich notwendig. **Vertrag:** CSS verantwortet Design, Größen und feste Anker; die jeweiligen UI-/Kartenmodule verantworten nur wirklich dynamische Geometrie oder Datenfarben. Für jede verbleibende Inline-Zuweisung dokumentieren, warum sie sich nicht durch eine Klasse oder CSS-Variable ausdrücken lässt.

## Vorgesehene Zuständigkeiten (vorläufig)

`styles/tokens.css` (Designvariablen), `styles/base.css` (Reset/Grundelemente), `styles/layout.css` (Viewport/Safe Areas), `styles/map-controls.css`, `styles/search.css`, `styles/panels.css`, `styles/markers.css`, `styles/utilities.css`.

Die **genaue** Aufteilung folgt erst nach vollständiger Inventur, insbesondere dem effektiven CSS-Kaskaden- und Browserabgleich. Layout-/CSS-Architektur gehört zum bestehenden UI-Modulvertrag und ist kein Anlass für Fachlogikänderungen.

## Noch zu prüfende Live-Referenz – keine voreilige Abnahme

- Aktive Preview-Version und Asset-Version live verifizieren. Quellcode-`sw.js` ist derzeit `pin2map-new-v58`; das ist **kein Nachweis**, dass v58 öffentlich veröffentlicht wurde.
- Screenshots und berechnete Bounding-Rects für iPhone-Viewport (~390×844), kleineren Bildschirm, iPad und Desktop (~1280×800) sichern.
- Oben: Einstellungen und Ebenen auf gemeinsamer Höhe, Suchleiste dazwischen ohne Überdeckung.
- Rechts unten: Info über Kartenwahl; links unten Zoom/Fit; Attribution bleibt sichtbar und nicht von Schaltflächen verdeckt.
- Ebenen-, Karten- und Einstellungsmenüs öffnen/schließen korrekt; Pin-Dialog ist randnah sichtbar, Verschiebevorschau und Bestätigung bleiben bedienbar.
- Safari-Browser und installierte iPhone-PWA gesondert visuell kontrollieren; tatsächlicher iPhone-Test kann nicht durch Chromium simuliert werden.
- Vor CSS-Refactor einen reproduzierbaren Browser-Baseline-Test und optional visuelle Screenshots als Golden Masters aufnehmen. Vorher keine kosmetischen Änderungen am Ausgangslayout.

**Benötigte Nutzerprüfung, sobald die tatsächliche Preview-Version feststeht:** iPhone Safari + installierte PWA jeweils oben (drei Elemente) und unten (Buttons/Attribution), danach Ebenendialog und randnaher Pin-Dialog. Unterschiede per Screenshot melden. Dieser Schritt wird gezielt angefragt und nicht als schon erfolgreich behauptet.

## Qualitätsschutz nach der Sanierung

1. Ein Eigentümer pro Komponenten-Selektor; keine zusätzlichen Overrides am Ende globaler Dateien.
2. Zentrale Tokens für Farben, Dimensionen, horizontale Anker, z-index-Schichten und Safe-Area-Abstände.
3. Responsive Varianten unmittelbar beim zuständigen Komponentenmodul; so wenige Breakpoints wie möglich.
4. Neue globale Selektoren und `!important` standardmäßig untersagt, begründete Leaflet-/Browser-Ausnahmen dokumentiert.
5. CI prüft nicht nur CSS-Textmuster, sondern über Parser/Stylelint deklarierte Zuständigkeiten und echte Browser-Kaskaden-/Geometrieeffekte.
6. Jede Etappe liefert **eine nachweislich getestete und veröffentlichte Preview-Version**; bei Fehlschlag bleibt die Etappe offen.

## Zweites Architekturthema nach CSS-Abnahme

Die weitere Bereinigung von `app.js` (Kompositionswurzel, UI-Events, Zustands- und Persistenzkoordination) folgt **erst nachdem die CSS-Sanierung vollständig abgenommen ist**. Das Thema ist als nächste Priorität vorgemerkt; während CSS-Etappen keine ungeprüfte gleichzeitige Umstrukturierung der Anwendungssteuerung.

## Sichtabnahme der bisherigen Darstellung durch den Auftraggeber (2026-11-10)

**Befund: visuelle Referenz ausdrücklich bestätigt.** Der Auftraggeber hat vier Screenshots der Entwicklungsvorschau unter https://pin2map.github.io/pin2map-new-test/preview/ für Desktop, iPhone und iPad bereitgestellt und erklärt: „Ja, auf allen Geräten entspricht die Darstellung meinen Vorstellungen.“

Folgende Elemente werden **als bestehende, zu bewahrende Darstellung** festgehalten:

- **Oben:** Einstellungs-Button links; Suchfeld dazwischen; Ebenen-Button rechts. Zahnrad und Ebenen-Button befinden sich auf derselben Höhe.
- **Ebenenpanel:** Rechtsbündig zum Auslöser; auf kleineren mobilen Viewports ausreichend breit und innerhalb der sichtbaren Kartenfläche, mit weißem Hintergrund, Schließen-Schaltfläche, Ebenenliste und „Neue Ebene“.
- **Unten:** Zoom-/Fit-Tasten links; Info-Taste oberhalb der Kartenwahl rechts; Leaflet-/OSM-Attribution sichtbar am Kartenrand.
- **Unterschiedliche Viewports:** Breite Desktopansicht, iPhone-Safari, iPhone ohne sichtbare Safari-Browserleisten (PWA-/Vollbildansicht) und iPad-Ansicht. Der Wechsel zwischen Straßen- und Topografiekarte ist visuell kompatibel.
- **Wichtig:** Unterschiede in angezeigten Pins und Kartenausschnitten auf den Screenshots stammen von unterschiedlichen lokalen Datensätzen bzw. Viewport-Ständen und sind **keine** CSS-Zielvorgabe.

**Abnahmeumfang:** Dies ist eine **manuelle, visuelle Freigabe** des vom Nutzer gesehenen Layouts. Nicht belegt sind die exakte ausgelieferte Service-Worker-Version, der Erfolg eines aktuellen GitHub-Actions-Laufs, eine automatisierte Live-Prüfung aller Interaktionen oder die Zukunftssicherheit der CSS-Regeln. Diese Nachweise werden nicht aus Screenshots abgeleitet.

**Konsequenz für Etappe B:** Die Sanierung verändert *nicht* die gewünschten Positionen, Farben, Buttonmaße oder Dialoggrößen. Jede Abweichung bedarf einer ausdrücklichen neuen Entscheidung. Vor einem größeren Abbau von Overrides die aktuellen Positionen in Chromium als tatsächliche Geometrie erfassen; für iPhone-spezifische WebKit-Effekte bleibt die obige Nutzerabnahme maßgeblich.

## Inkrement B1 – historische Ebenenpositionierung bereinigt (2026-11-10)

- Quellcodeänderungen: CSS-Regeln der ehemaligen **unten mittigen** Ebenensteuerung und links daneben positionierten Info-Taste gezielt entfernt. Auch die ursprünglichen veralteten \`#layersPanel\`-Anker wurden entfernt. Die derzeit gültige Anordnung (oben rechts / Info rechts unten) bleibt in den späteren aktiven Regeln enthalten.
- Im Ausgangs-Stylesheet wurden im ersten Schritt 12, im zweiten Schritt weitere 8 \`!important\` entfernt (402 → 382). Das sind strukturelle Textbefunde, **kein Nachweis identischer visueller Berechnung**.
- In \`tests/css-corner-position-contract.test.js\` sind Schutzbehauptungen gegen die entfernten alten Positionierungen ergänzt.
- Der aktuelle Quellcode-Service-Worker ist auf **v60** gesetzt und löst durch den Push eine neue Preview-Veröffentlichung aus.
- **Abnahme-Gate noch offen:** Erfolgreichen GitHub-Actions-Lauf, HTTPS-Auslieferung von v60 sowie tatsächliche mobile/weite Browser-Interaktion und PWA-Refresh prüfen. Die im Vorfeld vom Nutzer bestätigten Screenshots gelten als Soll-Zustand, sind **keine** Abnahme von v60.
- Keine neue CSS-Dateiaufteilung und keine Veränderung der Fachlogik; die nächste Migration bleibt auf eine kontrollierte CSS-Domäne begrenzt.

## Sicherungs-Gate nach Nutzerfreigabe – Live-Layout auf mehreren Viewports (2026-11-10)

Der vor der Sanierung vom Nutzer abgenommene Screenshotstand bleibt der visuelle Vertrag. Der veröffentlichte Browser-Smoke-Test (\`tests/preview-live-smoke.cjs\`) wurde nun so erweitert, dass er **390×844 (Telefon), 820×1180 (Tablet) und 1280×800 (Desktop)** sowie einen Telefonaufruf mit Tracking-Query prüft. Kontrolliert werden Kartenstart, gleiche obere Höhe von Einstellungen/Ebenen, überschneidungsfreies Suchfeld, Info über Kartenwahl, sichtbare Attribution, Ebenendialog samt Ein-/Ausblenden und Reload mit Service Worker.

Der Preview-Workflow reagiert künftig auch auf **Testdateiänderungen**; zuvor waren \`tests/**\` aus den Push-Auslösern ausgenommen. Dadurch können neue Live-Gates nicht unbemerkt auf dem Entwicklungszweig liegenbleiben, ohne dass der Veröffentlichungsworkflow sie ausführt.

**Status:** Quellcodeänderung an Test und Workflow in GitHub vorhanden und geprüft. Ein erfolgreicher GitHub-Actions-Lauf und die tatsächliche HTTPS-Auslieferung von v60 konnten mit den verfügbaren Tools nicht nachgewiesen werden. Browser- oder Nutzerabnahme von v60 darf deshalb noch nicht behauptet werden. Nächster zwingender Schritt vor weiteren Layoutänderungen: tatsächlichen Workflowstatus und die ausgelieferte Preview kontrollieren; bei weiterhin fehlendem direkten Zugriff gezielte Geräteprüfung durch den Nutzer anfordern.

## Nutzerprüfung nach Refresh – iPhone Safari (2026-11-10)

Der Auftraggeber hat die Entwicklungsvorschau auf einem iPhone in Safari nach der Bitte um Refresh erneut angesehen und einen Screenshot der Kartenansicht übermittelt. Seine ausdrückliche Rückmeldung lautet: **„unverändert, alles gut“**.

**Damit bestätigt:** Die sichtbare Kartenoberfläche nach Refresh entspricht weiterhin der zuvor freigegebenen Referenz. Im Screenshot befinden sich Zahnrad und Ebenen-Button oben auf gleicher Höhe, die Suchleiste dazwischen, Zoom/Fit links unten, Info über Kartenwahl rechts unten und die Leaflet-/OpenStreetMap-Attribution am unteren Rand.

**Grenzen:** Ein geöffneter Ebenendialog ist im neuen Screenshot nicht enthalten; dessen vorherige visuelle Abnahme gilt als Vergleichsgrundlage. Weder die genaue auf dem Gerät ausgelieferte Service-Worker-Versionskennung noch ein erfolgreicher GitHub-Actions-Lauf lassen sich aus dem Screenshot ableiten. Ebenso sind Desktop-/iPad-Regressionen nach den jüngsten CSS-Bereinigungen damit nicht erneut geprüft. Die vollständige Live- und CI-Abnahme bleibt bis zu diesen Nachweisen offen.

## Veröffentlichungsintegrität der CSS-Datei (2026-11-10)

Der Preview-Workflow prüft jetzt zusätzlich zu Content-Type und Markern den **SHA-256-Inhaltsvergleich** zwischen der tatsächlich über HTTPS ausgelieferten `/preview/styles.css` und der Datei `preview-source/styles.css` des laufenden Builds. Ein alter CSS-Stand mit demselben allgemeinen Textmarker kann damit nicht mehr fälschlich als aktuelle Veröffentlichung durchgehen. Die Browser-Smoke-Tests folgen erst nach diesem Prüfschritt.

**Status:** Workflowänderung im Entwicklungszweig gespeichert. Ob GitHub Actions diesen konkreten Lauf erfolgreich ausgeführt hat und v60 veröffentlicht ist, bleibt gesondert nachzuweisen; der Quellcode-Nachweis ersetzt nicht die Live-Prüfung. Die Bildschirmanordnung wurde durch diese Workflowänderung nicht verändert.

## CSS-Schuldenbudget als CI-Schutz (2026-11-10)

Für die vorläufige Monolith-CSS-Datei existiert jetzt `tests/css-debt-budget.test.js` als zusätzlicher automatischer Wächter. Er erlaubt **höchstens 382 aktive `!important`-Vorkommen** (gemessener v60-Stand gegenüber 402 zu Beginn) und schützt vor der Wiederaufnahme der entfernten unten-mittigen Ebenenpositionierung. Der Test liegt unter `tests/*.test.js` und wird dadurch von der vorhandenen Node-Testsuite im CI-Workflow erfasst.

**Anwendungsregel:** Bei weiteren Aufräumarbeiten den Grenzwert nach bestätigter Reduktion senken; nicht bloß erhöhen, um neue CSS-Overrides zu ermöglichen. Der Grenzwert ist eine **Übergangskontrolle**, kein langfristiger Qualitätsmaßstab und kein Ersatz für AST-/Ownership-Prüfungen oder die visuelle Browserabnahme.

**Prüfstand:** Die Quelltexte wurden gegen die beiden Testinvarianten geprüft (382, alte Positionsblöcke entfernt). Ein tatsächlich erfolgreicher Node-/CI-Lauf und die live ausgelieferte Preview-Version sind mit dem aktuellen Zugang weiterhin nicht nachgewiesen. Die Darstellung selbst wurde in diesem Schritt nicht geändert.

## Inkrement B2 – veraltetes zweizeiliges Header-Grid entfernt (2026-11-10)

- Die frühere zweizeilige Rasteranordnung der Kopfzeile (Grid mit 35px/43px-Zeilen), die alten Rasterpositionen für Ebenen- und Einstellungsbutton sowie die zugehörigen Rücksetzdeklarationen in neueren Flex-Regeln sind gezielt aus \`styles.css\` entfernt.
- Die Zahl der textuellen \`grid-column\`/\`grid-row\`/\`grid-template-*\`-Vorkommen in der CSS-Datei sank von 26 auf 6. Die Anzahl der \`!important\`-Deklarationen blieb bei 382.
- Die heute maßgeblichen Regeln für die oben links/rechts stehenden Buttons und die Suchleiste dazwischen wurden **nicht** verändert.
- Neu: \`tests/css-header-layout-contract.test.js\` schützt gegen die Rückkehr des Zweizeilen-Grids. Sechs Quelltextbedingungen wurden separat gegen die von GitHub gelesene Datei geprüft; das ist **keine** ausgeführte vollständige Node-/Browser-Testreihe.
- Der Quellcode-Stand trägt nun die Service-Worker-Version **v61**; Push löst die Preview-Pipeline aus.
- **Offen:** GitHub-Actions-Erfolg, Auslieferung der v61-Assets, Live-Browser-/PWA-Regression sowie optionaler iPhone-Abgleich. Der direkte HTTPS-Abruf schlug in dieser Arbeitsumgebung an gesperrtem Webzugriff beziehungsweise fehlender DNS-Auflösung fehl. Diese Einschränkung beweist **keinen** Fehler der veröffentlichten Anwendung.

**Gate:** Die vorherige iPhone-Nutzerabnahme gilt als visuelles Soll, nicht als automatische Abnahme von v61. Weitere eingreifende CSS-Umstrukturierung erst nach gesichertem Live-Stand.

## iPhone-Sichtabnahme nach Inkrement B2 (v61)

**Nutzerbestätigung vom 10.11.2026:** Nach der Aufforderung, die Entwicklungsvorschau auf dem iPhone zu aktualisieren und Suchleiste, obere Buttons sowie Ebenendialog mit der freigegebenen Darstellung zu vergleichen, meldete der Auftraggeber ausdrücklich: **„unverändert“**.

**Bewertung:** Die vom Nutzer geprüfte iPhone-Darstellung hat nach der Bereinigung des alten Header-Grids keine erkennbaren visuellen Regressionen. Dies ist die **manuelle Sichtabnahme** für Inkrement B2; das zuvor bestätigte Erscheinungsbild bleibt die Referenz für die weitere CSS-Sanierung.

**Nicht nachgewiesen:** Aus der Rückmeldung allein folgen weder die exakte auf dem Endgerät aktive Service-Worker-Versionskennung noch ein erfolgreicher GitHub-Actions-Lauf oder die Desktop-/iPad-Regression von v61. Diese Nachweise bleiben eigene Abschlusskriterien. Keine pauschale vollständige technische Freigabe behaupten.

## Inkrement B3 – überholte Suchergebnis-Positionierungen entfernt (v62)

- Aus der früheren mobilen Header-Anordnung wurden die durch spätere spezifische Regeln überschriebenen `top`-, `left`-, `right`-, `width`- und `transform`-Deklarationen für `.search-results` entfernt.
- Die mobile Höhenbegrenzung `max-height:42dvh` bleibt ausdrücklich bestehen. Die aktuellen übergeordneten Anker für Suchergebnisse (Desktop und mobil) wurden nicht verändert.
- Neuer Schutztest: `tests/css-search-results-contract.test.js`; seine fünf Quelltextbedingungen wurden gegen den von GitHub erneut gelesenen Stylesheet-Inhalt einzeln geprüft.
- `!important` bleibt bei 382; diese Etappe entfernt überschattete Normaldeklarationen und reduziert nicht den numerischen Override-Bestand.
- Cache-/Releasekennung auf `pin2map-new-v62` angehoben.
- **Noch offen:** vollständiger CI-/GitHub-Actions-Erfolgsnachweis, tatsächliche HTTPS-Auslieferung, Live-Browsertest sowie iPhone-Sichtprüfung für v62. Der öffentliche Abruf war über die verfügbare Webschnittstelle nicht möglich. Bis dahin keine Aussage „v62 vollständig getestet und veröffentlicht“.


## Inkrement B4 – ältere Panel-Offsets entfernt (v63, 2026-11-10)

- Drei überholte `.panel`-Positionierungen wurden entfernt: mobiler früherer Top-Abstand (99px + Safe Area) und zwei später überschattete offsets auf Basis von `--header-height`. Die heute wirksame `.panel`-Regel mit `top:calc(56px + env(safe-area-inset-top,0px))!important` bleibt bestehen. Das Ebenenpanel hat seine separate rechtsbündige `#app #layersPanel`-Regel.
- Der bisherige mobile `max-height:calc(100dvh - 125px)`-Wert wurde ausdrücklich erhalten. Keine beabsichtigte Layoutänderung.
- Neu: `tests/css-panel-position-contract.test.js`. Fünf Quelltextbedingungen wurden gegen die in GitHub gespeicherte CSS-Datei kontrolliert. Sie ersetzen keinen tatsächlichen Node-/Browserlauf.
- `!important`-Budget unverändert 382. Service-Worker-Version des Quellstands auf `pin2map-new-v63` gesetzt.
- **Noch offen:** Nachweis erfolgreich gelaufener GitHub Actions, öffentliche Auslieferung der v63-Dateien, Browser- und Gerätetest. Der direkte Preview-Webabruf liefert in dieser Arbeitsumgebung `DisabledError`. Eine erfolgreiche Veröffentlichung darf daraus nicht abgeleitet werden.

**Nächster Schritt:** Nicht weitere CSS-Domänen gleichzeitig umstellen, solange die Live-Prüfung offen ist. Vor einem größeren Panel-Refactoring die bereits bestätigte mobile Referenz mit der tatsächlich ausgelieferten v63 vergleichen.

## Manuelle iPhone-Panel-Abnahme nach Inkrement B4 (v63)

Der Auftraggeber wurde gebeten, die Preview auf dem iPhone zu aktualisieren und sowohl den Ebenendialog als auch die Einstellungen zu öffnen und auf unveränderte Darstellung sowie Bedienbarkeit zu prüfen. Die ausdrückliche Rückmeldung vom 10.11.2026 lautet: **„alles gut“**.

**Damit manuell abgenommen:** Die vom Auftraggeber geprüften beiden Panels entsprechen nach Inkrement B4 weiterhin dem freigegebenen Zustand und sind auf seinem iPhone bedienbar. Kein weiterer Gerätetest für denselben v63-Schritt erforderlich.

**Abgrenzung:** Die Nutzerrückmeldung belegt weder die genaue am Gerät aktive Service-Worker-Version noch erfolgreich abgeschlossene GitHub-Actions-Läufe oder eine erneute Desktop-/iPad-Prüfung. Diese technischen Nachweise bleiben gesondert offen und sind vor einer umfassenden Freigabe zu erledigen.

## Inkrement B5 – Ebenenliste mit einheitlichem Vier-Spalten-Layout (v64)

- Eine ältere CSS-Definition für `.layer-row` mit **fünf Spalten** (`25px 20px minmax(0,1fr) auto 30px`) wurde entfernt. Bereits davor existierte eine spätere, allgemein gültige **Vier-Spalten-Definition** (`25px 20px minmax(0,1fr) 30px`), für Mobilgeräte weiterhin `23px 15px minmax(0,1fr) 28px`. Die sichtbare Darstellung soll sich daher nicht verändern.
- Der Stil für den Löschen-Button und die geschützte private Ebene bleibt bestehen.
- Der neue Test `tests/css-layer-row-contract.test.js` schützt die Vier-Spalten-Verteilung auf beiden Viewportklassen und den Lösch-Button-Stil. Alle vier Quelltextbedingungen wurden gegen die erneut aus GitHub gelesene CSS-Datei geprüft, aber kein vollständiger Node-/Browser-Testlauf durchgeführt.
- `!important` bleibt bei 382; `grid-template-columns`-Vorkommen sinken von 4 auf 3. Version der PWA-App-Shell auf **v64** gesetzt.
- **Abnahme offen:** GitHub-Actions-Veröffentlichung, per HTTPS ausgelieferte v64-Dateien und echte Browser-/Geräteprüfung. Frühere Nutzerfreigaben gelten als Soll-Referenz, nicht als Beleg, dass v64 bereits ausgeliefert wurde.

## Manuelle iPhone-Abnahme der Ebenenliste nach Inkrement B5 (v64)

Nach Aufforderung zur Aktualisierung der Vorschau und Prüfung der Ebenenliste auf dem iPhone hat der Auftraggeber am 10.11.2026 ausdrücklich **„alles gut“** zurückgemeldet. Damit ist die Ebenenliste in der vom Nutzer geprüften Vorschau **visuell und hinsichtlich der Bedienbarkeit manuell abgenommen**. Die bestehende Vier-Spalten-Anordnung bleibt die verbindliche Referenz für spätere CSS-Arbeiten.

**Abgrenzung:** Eine konkrete am Gerät aktive Service-Worker-Versionskennung ist nicht bestätigt; die Rückmeldung ist kein selbständiger Nachweis für erfolgreichen GitHub-Actions-Lauf, identische ausgelieferte Assets oder die Desktop-/iPad-Regression von v64. Diese technischen Prüfungen bleiben für eine umfassende Freigabe offen.


## Inkrement B6 – gemeinsame Kartensteuerungs-Tokens und vertikale Unterkante (v65)

- Die bisher doppelte Festlegung `--p2m-map-circle-size:42px` wurde auf **eine maßgebliche Definition** im Map-Control-Designvertrag reduziert. Der Wert selbst ist unverändert.
- Die älteren unteren Zoom-Button-Abstände (10px + Safe Area, auf Telefon 9px + Safe Area) wurden aus dem früheren Regelblock entfernt. Ihre **gemeinsame aktuelle Unterkante** bleibt `--p2m-bottom-control-baseline` – dieselbe Quelle wie beim Kartenwahl-Button; der linke Zoom-Abstand von 10px bleibt erhalten.
- Die zuvor überschriebenen vertikalen Basemap-Button-Positionierungen wurden entfernt; die bereits vorhandene gemeinsame Baseline-Regel bleibt erhalten.
- Der `!important`-Bestand wurde **382 → 379** reduziert. `tests/css-debt-budget.test.js` enthält ab jetzt den strengeren Höchstwert **379**; `tests/css-bottom-control-ownership.test.js` prüft den einmaligen Größentoken und die Baseline-Zuständigkeiten.
- Alle acht gezielten Quelltextinvarianten wurden gegen die aus GitHub nachgelesenen Dateien geprüft. Damit ist **noch kein vollständiger Node-Testlauf** und **noch keine visuelle Browserprüfung** nachgewiesen.
- Der PWA-Quellstand enthält nun `pin2map-new-v65`. Die öffentliche HTTPS-Preview war über den verfügbaren Webzugang nicht erreichbar; der erfolgreiche Workflowlauf bzw. die Auslieferung von v65 konnte daher nicht unabhängig geprüft werden.
- Die zuletzt vom Nutzer abgenommene Darstellung, insbesondere die Zoom-/Fit-Schaltflächen links unten, die Kartenwahl rechts unten und die frei sichtbare Attribution, bleibt der zu bewahrende visuelle Vertrag. **v65 ist bis zu erneuter Geräte- und CI-/Live-Prüfung nicht vollständig abgenommen.**

## Manuelle iPhone-Abnahme der unteren Kartensteuerung nach B6 (v65)

Nach der Aufforderung, die Preview auf dem iPhone zu aktualisieren und speziell Zoom/Fit links unten, Kartenwahl rechts unten und die sichtbaren Kartenhinweise am unteren Rand zu prüfen, antwortete der Auftraggeber am 10.11.2026 ausdrücklich: **„alles gut“**.

**Manuell abgenommen:** Die überprüfte untere Kartensteuerung entspricht auf dem iPhone weiterhin der verbindlichen visuellen Referenz. Die im Inkrement B6 bereinigten Baseline-/Größentoken-Regeln verursachen für den Nutzer dort keine erkennbare Regression.

**Abgrenzung:** Die genaue am Gerät aktive PWA-/Service-Worker-Version, ein erfolgreicher GitHub-Actions-Lauf, identische über HTTPS ausgelieferte Assets sowie die erneute Desktop-/iPad-Prüfung sind dadurch nicht unabhängig nachgewiesen. Diese automatischen und breiteren Live-Abschlussprüfungen bleiben offen.

## Inkrement B7 – einheitliche Positionseigentümer für Eckbuttons und Kartenwahl (v66)

- Die zuvor mehrfach und teils mobil speziell festgelegten oberen Positionen des Einstellungsbuttons sind aus älteren CSS-Blöcken entfernt worden. Sein `z-index:1100` bleibt erhalten; die für die freigegebene Darstellung maßgebliche Position gehört ausschließlich dem gemeinsamen `--p2m-top-corner-*`-Vertrag am Ende von `styles.css`.
- Alte `bottom:60px`-/`59px`-Berechnungen des Kartenwahlmenüs wurden entfernt; die bereits vorhandene spätere `--p2m-bottom-control-baseline + 50px`-Regel ist alleiniger Eigentümer der vertikalen Menüposition. Das mobile `right:10px` bleibt erhalten.
- Zahl der `!important`-Deklarationen: **379 → 371** (zu Beginn 402). Die Budget-Prüfung wurde auf 371 gesenkt. Neuer Schutztest: `tests/css-top-corner-ownership.test.js`.
- Quellcode-Stand des Service Workers: `pin2map-new-v66`. Alle gezielten Quellen-Invarianten wurden gegen die erneut aus GitHub gelesenen Dateien geprüft. Ein tatsächlicher Node-/Browserlauf sowie ein erfolgreicher veröffentlichter Preview-Workflow können damit **nicht** behauptet werden.
- **Visuelle Abnahme v66 offen:** Die zuvor freigegebenen iPhone-/iPad-/Desktopansichten sind weiterhin Soll-Vorgabe. Vor einer vollständigen Freigabe sind die tatsächlich ausgelieferten Assets und die Button-/Menüpositionen im Browser erneut zu prüfen.

## Manuelle iPhone-Abnahme der Eckbuttons und Kartenwahl nach B7 (v66)

Nach der Aufforderung, die Preview auf dem iPhone zu aktualisieren und die **beiden oberen Buttons sowie das Kartenwahlmenü unten rechts** auf unveränderte Darstellung und Funktion zu prüfen, bestätigte der Auftraggeber am 10.11.2026 ausdrücklich: **„alles gut“**.

**Manuell abgenommen:** Die auf dem iPhone geprüften Bedienelemente entsprechen nach dem CSS-Inkrement B7 weiterhin dem visuellen und funktionalen Referenzzustand. Für diese konkrete Sichtprüfung ist keine weitere Rückfrage erforderlich.

**Weiterhin offen:** Die Rückmeldung allein bestätigt weder die genaue aktive Service-Worker-Version auf dem Endgerät noch den Status der GitHub-Actions-Ausführung, den Vergleich der tatsächlich ausgelieferten Assets oder die Desktop-/iPad-Regression nach v66. Diese technischen Prüfungen bleiben eigenständige Abschlussbedingungen.

## Inkrement B8 – veraltete individuelle Kartentastengrößen entfernt (v67)

- Alte Größenfestlegungen für Suche, Zoom/Fit, Ebenen und Info mit teils 33/35/40/42/44/46 Pixeln wurden aus den früheren Style-Blöcken entfernt, sofern sie vom späteren, höher priorisierten **gemeinsamen 42px-Kartensteuerungsvertrag** überschrieben waren. Die weiterhin maßgeblichen globalen 42px-Regeln in `#app button:is(...)` und `:is(#app > button, #app #map .leaflet-control button)` bleiben bestehen.
- Nicht entfernt: semantische Text-/Iconregeln sowie die **32px-Buttons in Dialogen**, insbesondere Pin-Dialog und Ebenenaktionen.
- Die Zahl der `!important`-Deklarationen sank **371 → 359** (initial 402). Der CSS-Schuldenbudget-Test wurde auf **359** gesenkt. Neuer Test: `tests/css-map-button-size-contract.test.js` für den gemeinsamen Größenvertrag und Dialog-Ausnahmen.
- Die Quelltext-Invarianten wurden gegen den aus GitHub gelesenen Stylesheet-Stand kontrolliert. Dies ersetzt keinen tatsächlich ausgeführten Node-/Browser-Testlauf.
- Der neue Quellstand trägt die Service-Worker-Version **v67**. **Noch nicht vollständig abgenommen:** Erfolgreicher GitHub-Actions-Lauf, öffentlich ausgelieferte v67-Assets, Live-Browsertest und eine gezielte Sichtprüfung der Kartenbuttons nach Refresh auf dem iPhone. Auch Desktop und iPad sind für diesen Stand erneut zu prüfen.

## Manuelle iPhone-Abnahme der Kartenbuttons und Dialogaktionen nach B8 (v67)

Nach der Aufforderung, die Entwicklungsvorschau auf dem iPhone zu aktualisieren und ausdrücklich **die Kartenbuttons sowie die kleineren Schaltflächen im Ebenendialog** zu prüfen, bestätigte der Auftraggeber am 10.11.2026: **„alles gut“**.

**Manuelle Abnahme:** Die visuelle Darstellung und Bedienbarkeit der geprüften Elemente auf dem iPhone entsprechen nach Inkrement B8 weiterhin der verbindlichen Referenz. Damit ist diese konkrete iPhone-Sichtprüfung erledigt; für denselben Schritt ist keine erneute Rückfrage erforderlich.

**Unabhängig offen:** Die Rückmeldung belegt nicht die aktive Service-Worker-Version, einen erfolgreichen GitHub-Actions-Lauf, die Auslieferung der identischen v67-Dateien oder die Desktop-/iPad-Regression. Diese Nachweise bleiben Voraussetzungen für eine vollständige technische CSS-Freigabe.

## Inkrement B9 – Pin-Dialog-Aktionsgrößen vereinheitlicht (v68)

- Die veralteten und redundant wiederholten Größenangaben (width/height/min-/max-, flex, padding, border-radius und teils Ausrichtung) in den spezifischen Regeln für den roten **Löschen**-Button und den grünen **OK**-Button wurden entfernt.
- Maßgeblich bleibt die bereits vorhandene, höher priorisierte gemeinsame Pin-Dialog-Regel `#pinPanel button:is(#movePin,#deletePin,#closePin,#showPinLayer)` mit `--p2m-pin-dialog-action-size:32px`. Die jeweiligen Farb-, Rahmen- und Hover-/Active-Stile bleiben erhalten.
- `!important` von **359 auf 340** reduziert (ursprünglich 402). Übergangsbudget auf 340 gesenkt. Neuer Schutztest: `tests/css-pin-dialog-action-ownership.test.js`.
- Acht Quelltextbedingungen wurden gegen die erneut aus GitHub gelesenen Dateien geprüft und waren erfüllt. Ein tatsächlicher Node- oder Live-Browsertest wurde damit **nicht** nachgewiesen.
- Die neue Quellcode-Releasekennung ist `pin2map-new-v68`. CI-/Pages-Deploy und exakte Live-Auslieferung sowie die iPhone-/iPad-/Desktop-Sichtprüfung für diesen Stand bleiben **offen**.
- Die vom Auftraggeber zuvor freigegebenen Größen, Farben und Positionen der Dialogaktionen sind ausdrücklich der zu bewahrende Sollzustand. Keine Änderungen an Pin-Daten, App-Logik oder Referenzbranches.

## Manuelle iPhone-Abnahme der Pin-Dialog-Aktionen nach B9 (v68)

Nach der Aufforderung, die Entwicklungsvorschau auf dem iPhone zu aktualisieren, einen Pin zu öffnen und den **roten Löschen-Button sowie den grünen OK-Button** auf unveränderte Darstellung und Funktion zu prüfen, antwortete der Auftraggeber am 10.11.2026 ausdrücklich: **„alles gut“**.

**Manuelle Sicht- und Bedienabnahme:** Beide geprüften Pin-Dialog-Aktionen entsprechen nach der Größenregel-Bereinigung in v68 weiterhin dem bisherigen, freigegebenen Zustand. Für diesen einzelnen iPhone-Test ist keine erneute Nutzerprüfung erforderlich.

**Weiterhin offen:** Die Rückmeldung belegt nicht die tatsächlich aktive PWA-/Service-Worker-Version auf dem Gerät, einen erfolgreichen GitHub-Actions-Lauf, die exakte HTTPS-Auslieferung von v68 oder eine aktuelle Desktop-/iPad-Regression. Diese Nachweise bleiben vor einer umfassenden technischen CSS-Freigabe zu erbringen.

## Inkrement B10 – gemeinsame Größen für Pin-Verschieben und Refresh (v69)

- Die veralteten individuellen Größenregeln für `#movePin` einschließlich des alten 44px-Mobil-Overrides wurden entfernt. Größe und Form bleiben über `#pinPanel button:is(#movePin,#deletePin,#closePin,#showPinLayer)` und die gemeinsame **32px-Pin-Aktionsvariable** definiert; die Gestaltung mit weißem Hintergrund bleibt unverändert.
- Die individuellen Größen-, Ausrichtungs- und Form-Overrides des Refresh-Buttons wurden entfernt. Größe und runde Form werden durch den bestehenden **42px-Kartensteuerungsvertrag** festgelegt. Eigene Position (`top:35dvh` mit Prozent-Fallback) und Z-Reihenfolge bleiben erhalten.
- Wichtige visuelle Ausnahme: Weißer Refresh-Hintergrund, Rahmenfarbe, Schriftfarbe und Schatten wurden **ausdrücklich erhalten**, damit der Refresh-Button bei Verwendung des allgemeinen Kartensteuerungsvertrags keine abweichende Oberfläche erhält.
- Die Zahl der `!important`-Deklarationen sank von **340 auf 319** (Ausgangsstand 402). Der Budgettest ist auf 319 verschärft; neuer Regressionstest: `tests/css-map-and-move-button-ownership.test.js`.
- GitHub-Quellstand: **v69** (`pin2map-new-v69`). Gezielt geprüfte CSS-Quelltextbedingungen stimmen; vollständiger Node-Testlauf und verifizierter öffentlicher Preview-Deploy/Browsertest wurden dadurch **nicht** nachgewiesen.
- **Abnahme offen:** Die tatsächliche iPhone-Darstellung von Pin-Verschieben und Refresh sowie die Desktop-/iPad-Regressionsprüfung für v69. Keine Änderung der Pin-Daten oder Anwendungslogik.

## Manuelle iPhone-Abnahme von Refresh und Pin-Verschieben nach B10 (v69)

Der Auftraggeber bestätigte am 10.11.2026 nach Aufforderung zum Refresh der Preview und zur Prüfung des **Refresh-Buttons sowie des Verschieben-Buttons im Pin-Dialog** auf dem iPhone ausdrücklich: **„alles gut“**.

**Manuell abgenommen:** Die beiden konkret geprüften Bedienelemente entsprechen hinsichtlich Darstellung und Bedienbarkeit weiterhin dem bisherigen Referenzzustand. Die CSS-Bereinigung v69 ist für diese iPhone-Sichtprüfung akzeptiert.

**Technische Abgrenzung:** Die Nutzerbestätigung ist kein unabhängiger Beleg für die aktive Service-Worker-Version, den erfolgreichen GitHub-Actions-Lauf, die identische öffentliche Auslieferung aller v69-Dateien oder die aktuelle Desktop-/iPad-Regression. Diese Prüfungen bleiben offene Freigabebedingungen.

## Inkrement B11 – eindeutiger Eigentümer der mobilen Suchleiste (v70)

- Der ältere mobile `#app .topbar`-Block mit `left:60px; right:8px; width:calc(100% - 68px)` und `transform:none` wurde entfernt. Seine Werte waren durch die spätere mobile, ebenso spezifische Suchleistenregel mit dem gemeinsamen `--p2m-top-search-clearance`-Token überholt.
- Die identische zweite Definition von `--p2m-top-search-clearance:60px` innerhalb des Mobil-Media-Blocks wurde entfernt. Es verbleibt eine einzige zentrale Definition, die für Desktop und Mobilgeräte gilt; die mobilen Eckabstände von 10px bleiben bewusst erhalten.
- Neuer Schutztest `tests/css-header-ownership.test.js` kontrolliert die Einmaligkeit des Tokens und die mobile Suchleistenposition. Die gezielten Quellcodebedingungen wurden anhand erneut aus GitHub gelesener Dateien überprüft. **Ein tatsächlicher Node-Testlauf wurde nicht ausgeführt.**
- CSS-`!important`-Bestand: **319 → 314** (ursprünglich 402). Das Übergangsbudget wurde entsprechend auf 314 gesenkt.
- PWA-Quellversion: **v70**. **Abnahme offen:** erfolgreicher GitHub-Actions-Lauf, veröffentlichte Preview-Dateien und visuelle Mobile-/Tablet-/Desktop-Prüfung der Suchleiste und der Eckbuttons. Vorherige iPhone-Abnahmen sind der zu bewahrende Referenzzustand, aber kein Nachweis der aktuellen Auslieferung.

## Manuelle iPhone-Abnahme der mobilen Suchleiste nach B11 (v70)

Nach der Aufforderung, die Entwicklungsvorschau auf dem iPhone zu aktualisieren und gezielt die **Suchleiste sowie die beiden oberen Eckbuttons** auf unveränderte Darstellung zu prüfen, bestätigte der Auftraggeber am 10.11.2026: **„alles gut“**.

**Manuell abgenommen:** Die vom Nutzer geprüfte iPhone-Darstellung der Suchleiste und oberen Eckbuttons entspricht nach der CSS-Bereinigung B11 weiterhin dem freigegebenen visuellen Referenzzustand. Für diesen einzelnen Schritt ist keine weitere Nutzerprüfung erforderlich.

**Separat offen:** Diese Bestätigung weist weder die genaue aktive Service-Worker-Version noch einen erfolgreichen GitHub-Actions-Lauf, eine unabhängig bestätigte HTTPS-Auslieferung der v70-Dateien oder die aktuelle Desktop-/iPad-Regression nach. Diese Abschlussprüfungen bleiben bestehen.

## Inkrement B12 – CSS-Architekturvertrag und automatische Token-Wächter (v70 unverändert)

- Neu: `docs/CSS_ARCHITEKTURREGELN.md` als verbindliche Definition für CSS-Zuständigkeiten, Token, Ausnahmen, Änderungsprozess, Regressionstests und Abschlussgates vor der geplanten `app.js`-Bereinigung.
- Neu: `tests/css-design-token-ownership.test.js` sichert sechs zentrale Design-Tokens gegen mehrfache Definitionen und kontrolliert acht gemeinsame CSS-Größen-/Positionsregeln sowie fünf entfernte harte Altwerte. Alle auf dem erneut aus GitHub gelesenen CSS-Stand überprüften Quelltextbedingungen erfüllen die erwarteten Invarianten.
- **Keine Änderung an `styles.css`, `sw.js` oder der App-Laufzeit** in diesem Inkrement. Version bleibt **v70**, `!important`-Schuldenbudget bleibt **314**. Für diese reine Test-/Dokumentationsänderung ist keine neue Geräteabnahme erforderlich.
- Die tatsächliche Ausführung der neuen Node-Tests in GitHub Actions und die unabhängige Live-/Desktop-/iPad-Verifizierung sind **weiter offen**. Ein GitHub-Commit allein ist kein bestandener CI-Lauf.

## Inkrement B13 – Ebenenbutton erhält ausschließlich gemeinsame Kartenbutton-Gestaltung (v71)

- Die ältere Sondergestaltung von `.layers-bottom-button` wurde um die bereits überholten festen Maße (46px normal, 44px mobil), eigene Rahmen-, Hintergrund-, Schatten-, Farbangaben und die pixelgebundene Zeilenhöhe bereinigt.
- **Maßgeblich** bleiben der gemeinsame 42px-Kartensteuerungsvertrag `:is(#app > button, #app #map .leaflet-control button)` und die separaten, zuvor abgenommenen Positionen des oberen rechten Layers-Buttons. Nur Symboltypografie und Stacking bleiben am spezifischen Button.
- Neu: `tests/css-layers-button-ownership.test.js` bewacht die klare Zuständigkeit und das Ausbleiben des alten mobilen 44px-Overrides.
- **`!important` unverändert: 314.** Auch redundante Deklarationen *ohne* `!important` zählen zum CSS-Chaos und werden schrittweise entfernt.
- Service-Worker-Quellversion auf **v71** angehoben. Alle Quelltextbedingungen sind gezielt zu kontrollieren; ein unabhängiger erfolgreicher CI-Lauf und die öffentliche Auslieferung der v71-Assets sind damit nicht nachgewiesen.
- **Manuelle Abnahme v71 offen:** Ebenenbutton oben rechts und Ebenenliste auf iPhone sowie breitere Browser-/Tablet-/Desktop-Regressionsprüfung. Die früheren Nutzerfreigaben dienen weiterhin als Sollreferenz.

## Manuelle iPhone-Abnahme des Ebenenbuttons nach B13 (v71)

Nach der Aufforderung, die Entwicklungsvorschau auf dem iPhone zu aktualisieren und gezielt den **Ebenenbutton oben rechts** sowie das **Öffnen und Bedienen der Ebenenliste** auf unveränderte Darstellung und Funktion zu prüfen, bestätigte der Auftraggeber am 10.11.2026 ausdrücklich: **„alles gut“**.

**Manuell abgenommen:** Die beiden überprüften UI-Funktionen entsprechen nach der Bereinigung B13 weiterhin dem bisherigen iPhone-Referenzzustand. Für diese konkrete Sicht- und Bedienprüfung ist keine weitere Nutzerabnahme erforderlich.

**Technisch offen:** Die Rückmeldung belegt weder die exakte aktive Service-Worker-Version noch den erfolgreichen GitHub-Actions-Lauf, die unveränderte HTTPS-Auslieferung der v71-Dateien oder die aktuelle Desktop-/iPad-Regression. Diese Abschlussnachweise sind weiterhin gesondert zu erbringen.

## Inkrement B14 – Info-Button: visuelle Gestaltung und Position haben eindeutige Eigentümer (v72)

- Die alte `.labels-toggle`-Sondergestaltung wurde um inzwischen überholte feste Größen (38px), Positionswerte (links/unten), separate Rahmen-/Hintergrund-/Farb-/Schattenwerte und Schriftfamilie/-größe bereinigt.
- Die bestehende und bereits abgenommene **42px-Kartenbutton-Gestaltung** sowie die spätere **Info-Position über dem Kartenwahlbutton rechts unten** bleiben unverändert maßgeblich. Lokale Regeln enthalten nur Positionierungsart, Stacking und Schriftgewicht.
- Neuer Schutztest: `tests/css-info-button-ownership.test.js`, der das Zurückkehren der alten Angaben verhindern soll. Der CSS-`!important`-Bestand bleibt **314**, weil ausschließlich ältere normale Deklarationen entfernt wurden.
- Quellversion **v72**. Quelltextkontrolle, Node-Testausführung, veröffentlichte Preview und visuelle Geräteprüfung sind getrennte Gates; insbesondere die Live-Darstellung nach v72 wurde noch nicht unabhängig bestätigt.

## Manuelle iPhone-Abnahme des Info-Buttons nach B14 (v72)

Nach der Aufforderung, die Entwicklungsvorschau auf dem iPhone zu aktualisieren und den **Info-Button (i) unten rechts** hinsichtlich unveränderter Darstellung, Position und funktionierendem Menü zu kontrollieren, bestätigte der Auftraggeber am 10.11.2026 ausdrücklich: **„alles gut“**.

**Manuell abgenommen:** Der auf dem iPhone überprüfte Info-Button entspricht nach der Bereinigung B14 weiterhin der freigegebenen optischen und funktionalen Referenz. Für diese konkrete Sichtprüfung ist keine weitere Rückfrage erforderlich.

**Eigenständig offen:** Eine aktive v72-Service-Worker-Version am Gerät, ein erfolgreicher GitHub-Actions-Lauf, die exakt identische Auslieferung der v72-Assets und die aktuelle Desktop-/iPad-Regression sind dadurch nicht unabhängig nachgewiesen. Diese technischen Abschlussprüfungen bleiben offen.

## Inkrement B15 – Suchkapsel-Höhen und Button-Abstand eindeutig zugeordnet (v73)

- Im früheren Suchleistenblock wurden überholte Höhenangaben für `.topbar` (44px), `.topbar .search` (35px) und das Such-Eingabefeld (35px) entfernt. Maßgeblich bleiben die bereits vorhandenen, höher spezifischen `#app`-Regeln mit **52px / 42px / 40px**. Ebenso entfernt wurde der frühere Randabstand `margin:0 1px 0 0` des Suchbuttons; die spätere, geltende `margin:0!important`-Regel bleibt erhalten.
- **`!important`: 314 → 312** (ursprünglich 402). Das Schuldenbudget ist auf 312 gesenkt. Neuer Test `tests/css-search-capsule-ownership.test.js` überwacht die endgültigen Maße und verhindert die Rückkehr der überholten Werte.
- PWA-Quellrelease: **v73**. Die Quelldateien wurden in GitHub aktualisiert; eine tatsächliche Node-Testausführung, eine erfolgreiche CI-/Pages-Veröffentlichung und die Auslieferung der identischen Dateien sind noch nicht unabhängig bestätigt.
- **Manuelle Abnahme offen:** Suchleiste und Suchbutton auf dem iPhone nach Refresh, sowie die abschließende Desktop-/iPad-Regression. Kein Eingriff in Anwendungslogik oder lokale Pin-Daten.

## Manuelle iPhone-Abnahme der Suchleiste nach B15 (v73)

Der Auftraggeber bestätigte nach der gezielten Prüfaufforderung für **Suchleiste und Suchbutton** auf dem iPhone am 10.11.2026 mit **„alles gut“**, dass Darstellung und Funktion weiterhin wie erwartet sind. Eine dazwischenliegende Nachricht **„ok“** war zuvor ausdrücklich als Zustimmung zum Fortfahren und nicht als Testergebnis behandelt worden; die spätere explizite Bestätigung wird hier als manuelle Sicht-/Funktionsabnahme für die vom Nutzer geprüfte Vorschau festgehalten.

**Abgrenzung:** Die Rückmeldung weist nicht unabhängig nach, welche Service-Worker-Version auf dem Gerät aktiv war, ob GitHub Actions erfolgreich war oder ob die v73-Assets vollständig und identisch ausgeliefert wurden. Ebenso bleiben die Desktop-/iPad-Regression und die technische Live-Veröffentlichungsprüfung offen.

## Inkrement B16 – nicht mehr existierender Headerbutton bereinigt (v74)

- Der aktuelle HTML-Header enthält ausschließlich die Suchform mit Suchbutton; ein Element mit der alten Klasse `.topbtn` kommt dort nicht mehr vor. Auch die geprüften aktuellen Controller-/UI-Module referenzieren sie nicht.
- **Acht verbliebene `.topbtn`-CSS-Regelstellen** einschließlich älterer mobiler Größen- und Priority-Overrides wurden vollständig entfernt. Die tatsächlich angezeigte Suche und ihre bestehenden Klassen `.topbar` / `.search` bleiben unverändert.
- Der neue Test `tests/css-unused-header-control.test.js` überprüft, dass die tote Klasse weder im Stylesheet noch im aktuellen HTML auftaucht und dass die Suchform und ihr Button vorhanden bleiben.
- `!important`-Deklarationen: **312 → 301** (anfänglich 402). Budget entsprechend 301. PWA-Quellversion **v74**.
- **Wichtig:** Trotz entferntem unbenutztem CSS ist dies eine Quellcodeänderung mit offenem technischen Abschluss: unabhängiger Node-Testlauf, GitHub-Actions/Pages-Erfolg, Abgleich der öffentlich ausgelieferten Version und Browserregressionen auf Desktop/iPad. Eine erneute iPhone-Sichtprüfung der Suchleiste ist empfohlen; das bisherige manuelle v73-OK bleibt die Sollreferenz.

## Manuelle iPhone-Abnahme des Headers nach B16 (v74)

Nach der Aufforderung, die Vorschau auf dem iPhone zu aktualisieren und **Suchleiste sowie obere Buttons** nach der Entfernung der nicht mehr verwendeten `.topbtn`-Regeln auf unveränderte Darstellung und Funktion zu prüfen, bestätigte der Auftraggeber am 10.11.2026 ausdrücklich: **„alles gut“**.

**Manuell abgenommen:** Der überprüfte iPhone-Header entspricht weiterhin der zuvor freigegebenen Darstellung und Bedienbarkeit. Für dieses Inkrement ist die konkrete iPhone-Sichtprüfung abgeschlossen.

**Technische Abgrenzung:** Die Rückmeldung belegt weder die am Gerät aktive Service-Worker-Version noch einen erfolgreichen GitHub-Actions-Lauf, die exakte öffentliche Auslieferung aller v74-Dateien oder die Desktop-/iPad-Regression. Diese technischen Abschlussgates bleiben offen.
