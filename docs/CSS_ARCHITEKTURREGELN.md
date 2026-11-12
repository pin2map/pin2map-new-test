# CSS-Architekturregeln – pin2map NEW

**Status:** verbindlicher Migrations- und Entwicklungsvertrag für den Branch `feature/leaflet-modular-core` (10.11.2026). Die vorhandene Oberfläche gilt als Referenz, nicht die Historie ihrer CSS-Overrides.

## Grundprinzip

**Eine Zuständigkeit pro Eigenschaft und Komponente.** Ältere, überholte Deklarationen werden an der Quelle entfernt; neue visuelle Änderungen dürfen nicht als weitere pauschale `!important`-Overrides am Dateiende angehängt werden.

Die derzeitige Datei `styles.css` ist noch ein Übergangszustand und enthält historische Ausnahmen. Sie wird komponentenweise konsolidiert, ohne das bestehende, manuell abgenommene UI zu verändern.

## Zuständigkeiten

| Bereich | Zentrale Festlegung | Erlaubte Ausnahmen |
| --- | --- | --- |
| Runde Kartenbuttons | `--p2m-map-circle-size` und gemeinsamer Map-Control-Vertrag | Buttonposition, semantische Farben; keine eigenen Durchmesser |
| Suchbutton innerhalb der Suchkapsel | 42px große Antippfläche (`--p2m-search-tap-size`), davon unabhängiger 30px-Sichtkreis (`--p2m-search-ring-size`) über `::before`, Lupensymbol 18px (`--p2m-search-icon-size`) | Nur der Ring wird optisch kleiner; die Antippfläche bleibt gut bedienbar. Der Button ist kein Mitglied des allgemeinen Map-Button-Selectors |
| Untere Kartenbuttons | `--p2m-bottom-control-baseline` | Seitlicher Abstand und eigenständiges Karten-Credit-Layout |
| Obere Eckbuttons | `--p2m-top-corner-inset`, `--p2m-top-corner-offset` | Mobile Werte desselben Tokens |
| Suchkapsel zwischen Eckbuttons | `--p2m-top-search-clearance` | Inhalt, Suchergebnisse |
| Pin-Dialog-Aktionen | `--p2m-pin-dialog-action-size`, gemeinsamer `#pinPanel button:is(...)`-Vertrag | Löschen-/OK-Farben, Icon und Zustandsdarstellung |
| Panels/Ebenenliste | bestehende, abgenommene Endregeln | Anpassungen nur mit gezieltem Vertrags- und Browsertest |

**CSS-Besitzregeln:** Ein Modul darf nur seine Darstellung steuern. Fachliche Zustände gehören in das Zustands-/Anwendungsmodell; CSS darf auf explizite Zustandsklassen/Attribute reagieren. Inline-Styling ist auf wirklich dynamische, geometrische Laufzeitwerte zu begrenzen und muss explizit dokumentiert werden.

## Änderungen und Tests

1. **Vorher** die aktuell wirksame CSS-Regel anhand Selektorspezifität, `!important`, Reihenfolge und Media Queries bestimmen. Gleichnamige Selektoren sind nicht automatisch gleich wirksam.
2. Redundante Deklarationen **entfernen statt überlagern**. Bestehende Tokens benutzen, keine zweite Token-Definition erstellen. Semantische Ausnahmen explizit erhalten.
3. Einen fokussierten Regressionstest für die geänderte Zuständigkeit hinzufügen. Bestehende CSS-Tests müssen weiter bestehen; `tests/css-design-token-ownership.test.js` schützt zentrale Token und bereits entfernte Altwerte.
4. `tests/css-debt-budget.test.js` verbietet das stille Wachstum der `!important`-Altlasten (aktuelle Grenze: **298**). Den Grenzwert nach verifizierter Bereinigung senken; niemals nur zur Beschwichtigung eines Fehlers erhöhen.
5. GitHub Actions führt `node --test tests/*.test.js` aus. Ein gespeicherter Test ist **kein Nachweis für einen erfolgreichen CI-Lauf**. Bei Änderungen an `styles.css` auch die Service-Worker-Releasekennung fortschreiben, die öffentliche Preview-Datei verifizieren und die betroffenen Geräteansichten prüfen.
6. Manuelle iPhone-, iPad- und Desktop-Freigaben, CI-Erfolg, HTTPS-Auslieferung und aktiver Service-Worker-Stand sind **getrennt zu dokumentieren**. Das letzte iPhone-OK ersetzt keine technische Versionsermittlung.

## Status der CSS-Sanierung und Übergabe an die Anwendungsarchitektur

**Beschluss 2026-11-11: CSS-Arbeit nach B38/v100 vorläufig pausiert, nicht als abgeschlossen bewertet.** Die bislang wirksamen Komponentenverträge, die Oberflächenreferenz und das `!important`-Budget von **298** bleiben verbindlich. Bis zur Wiederaufnahme keine neuen CSS-Overrides ohne fachlich/visuell begründete Notwendigkeit; bei Änderungen weiterhin Eigentümer-/Regressionstests und reale Preview-Freigabe.

Eine **vollständige CSS-Abnahme** erfordert weiterhin: dokumentierte Eigentümer der Komponentenregeln, keine ungeklärten konkurrierenden Regeln, bestandene automatische Tests, verifizierte Preview sowie erneut bestätigte Layouts für iPhone, iPad und Desktop. Diese Bedingungen sind **noch nicht erfüllt bzw. nicht nachgewiesen**.

**Geänderte Arbeitsreihenfolge:** Statt auf vollständige kosmetische CSS-Bereinigung zu warten, wird nach nachzuholender technischer Baseline-Prüfung die inkrementelle Entflechtung von `app.js` als nächstes Architekturthema aufgenommen. Die Änderbarkeit des Codes hat Vorrang; größere CSS-Umstrukturierung und `app.js`-Refactoring werden nicht gleichzeitig vorgenommen. Die CSS-Komplettsanierung bleibt ein offener späterer Arbeitsauftrag.

Die Vorgänger-App dient als funktionale und visuelle Referenz, nicht als Quellcode- oder CSS-Architekturvorlage. Die stabile Anwendung auf `main` bleibt unberührt.

## Audit- und Vorbereitungsbaseline v148 (2026-11-12)

Die aktuelle `styles.css` ist für die Architektur-Stabilisierung **nicht** verändert worden: **293** `!important`-Vorkommen bei weiter gültigem Limit **298**. B38 bleibt bewusst **pausiert**, die vollständige visuelle CSS-Abnahme ist weiterhin offen. Ein niedrigerer Grenzwert ist erst nach einer tatsächlich getesteten Komponentenbereinigung legitim.

**Pflicht vor einer größeren Feature-UI:** betroffene CSS-Eigentümer ermitteln (bereits wirksame Selektoren und Media Queries), bestehende Tokens/Map-Button-Verträge beibehalten, keine neue globale Kaskadenebene und keine zusätzlichen `!important`-Regeln, sondern nur für das Feature relevante Komponentenregeln an ihrer Quelle konsolidieren und mit gezielten Node-/Chromium-/Geräte-Gates prüfen. Ein allgemeines Refactoring ohne konkreten visuellen oder funktionalen Bedarf bleibt unzulässig. Für die Preview-Paketgrenze gilt `docs/ARCHITEKTUR_STABILISIERUNG_2026-11-12.md`.


## v149 – gezielte Konsolidierung des Pin-Dialog-Eigentümers (2026-11-12)

Für den sechsteiligen Button-Footer wurde der bisherige expandierende Ebenenselektor am bestehenden Eigentümer in einen runden Trigger überführt. Die weggefallenen, spezialisierten Picker-Overrides wurden im ursprünglichen Regelbereich entfernt; neue Regeln für Notizfeld, Datum, URL und Buttons bleiben in der `#pinPanel`-Komponente. Die textuelle `!important`-Zahl beträgt im v149-Quellstand **260** statt 293; das bestehende konservative Testbudget **298** wird vor einer vollständig bestätigten Veröffentlichungs-/Geräteabnahme nicht eigenmächtig geändert. CSS-B38 und die übrige sanierungsbedürftige CSS-Architektur bleiben pausiert; daraus folgt **keine** neue allgemeine CSS-Freigabe. Auf iOS sind für editierbare Notizen und URL 16 px gegen Eingabezoom vorgesehen.


## v151 – reparierte CSS-Eigentümerschaft für Pin-Dialog (2026-11-12)

Der misslungene sichtbare v149-Pin-Dialog beruhte insbesondere auf einer alten `.pin-panel`-Regel mit `max-height:min(320px,... )!important` und `overflow-y:auto!important`, die trotz neuer Komponentenstile den Scrollbalken erzwang. Diese alte Vorschrift wurde **an der ursprünglichen Quelle entfernt**, ebenso alte `!important`-Regeln für alle Pin-Labels und die 15px-Namenseingabe. Die mobile Basishöhe richtet sich nun nach der tatsächlichen Komponente; nur auf extrem flachen Viewports ist kontrolliertes vertikales Scrollen vorgesehen.

Der neue `#pinLayerMenu` ist eine durch `ui/pin-layer-picker.js` an `document.body` gehängte, feste Viewport-Überlagerung mit eigenen Stilen und alleiniger innerer vertikaler Listen-Scrollbarkeit bei acht oder mehr Ebenen. Die übrigen lokalen Dialogstile bleiben `#pinPanel`-bezogen. Einziger Größen-Token `--p2m-pin-dialog-action-size:38px`, nicht pro Breakpoint neu zu definieren. `!important` im aktuellen Quellstand: **245** gegenüber v149 **260** und dem weiterhin gültigen Höchstbudget **298**. Die generelle CSS-Sanierung B38 bleibt pausiert; die Bereinigung gilt nur diesem Dialog.

`tests/pin-dialog-visual.cjs` ist verbindlicher Browser-Gate für kompakte 320/375px und 768px Gerätebreiten, normale Notizen, URL und eine lange achtteilige Ebenenliste; Screenshots sowohl aus dem Node/Chromium-Workflow als auch von der tatsächlich veröffentlichten Preview. Ein grüner Strukturtest ohne sichtbares Browserlayout genügt für Dialogänderungen nicht mehr.
