# CSS-Architekturregeln – pin2map NEW

**Status:** verbindlicher Migrations- und Entwicklungsvertrag für den Branch `feature/leaflet-modular-core` (10.11.2026). Die vorhandene Oberfläche gilt als Referenz, nicht die Historie ihrer CSS-Overrides.

## Grundprinzip

**Eine Zuständigkeit pro Eigenschaft und Komponente.** Ältere, überholte Deklarationen werden an der Quelle entfernt; neue visuelle Änderungen dürfen nicht als weitere pauschale `!important`-Overrides am Dateiende angehängt werden.

Die derzeitige Datei `styles.css` ist noch ein Übergangszustand und enthält historische Ausnahmen. Sie wird komponentenweise konsolidiert, ohne das bestehende, manuell abgenommene UI zu verändern.

## Zuständigkeiten

| Bereich | Zentrale Festlegung | Erlaubte Ausnahmen |
| --- | --- | --- |
| Runde Kartenbuttons | `--p2m-map-circle-size` und gemeinsamer Map-Control-Vertrag | Buttonposition, semantische Farben; keine eigenen Durchmesser |
| Suchbutton innerhalb der Suchkapsel | `--p2m-search-button-size:32px` und `--p2m-search-icon-size:18px`; eigener `#app #searchButton.p2m-icon-control`-Vertrag | Bewusst kleiner als die 42px-Kartenbuttons; kein Mitglied des allgemeinen Map-Button-Selectors |
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
4. `tests/css-debt-budget.test.js` verbietet das stille Wachstum der `!important`-Altlasten (aktuelle Grenze: **299**). Den Grenzwert nach verifizierter Bereinigung senken; niemals nur zur Beschwichtigung eines Fehlers erhöhen.
5. GitHub Actions führt `node --test tests/*.test.js` aus. Ein gespeicherter Test ist **kein Nachweis für einen erfolgreichen CI-Lauf**. Bei Änderungen an `styles.css` auch die Service-Worker-Releasekennung fortschreiben, die öffentliche Preview-Datei verifizieren und die betroffenen Geräteansichten prüfen.
6. Manuelle iPhone-, iPad- und Desktop-Freigaben, CI-Erfolg, HTTPS-Auslieferung und aktiver Service-Worker-Stand sind **getrennt zu dokumentieren**. Das letzte iPhone-OK ersetzt keine technische Versionsermittlung.

## Abschluss der CSS-Sanierung

Nicht allein die Anzahl `!important` entscheidet über Fertigstellung, sondern: dokumentierte Eigentümer der Komponentenregeln, keine ungeklärten konkurrierenden Regeln, bestandene automatisierte Tests, verifizierte Preview und erneut bestätigte Layouts für iPhone, iPad und Desktop. Erst danach wird die **zentrale Anwendungssteuerung `app.js`** als nächstes Architekturthema umfassend angegangen.

Die Vorgänger-App dient als funktionale und visuelle Referenz, nicht als Quellcode- oder CSS-Architekturvorlage. Die stabile Anwendung auf `main` bleibt unberührt.
