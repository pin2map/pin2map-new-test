# Modularisierung – Pin-Verschiebeablauf (2026-11-09)

**Zweig:** `feature/leaflet-modular-core` in `pin2map/pin2map-new-test`. Keine Änderung an `main` oder dem geschützten Referenzstand.

## Ziel und Ergebnis

Der fachliche Ablauf **Verschiebung beginnen → Zielvorschau → bestätigen oder abbrechen** liegt jetzt im unabhängigen Anwendungscontroller `application/pin-move-controller.js`.

Die Verantwortlichkeiten sind ausdrücklich getrennt:
- `application/pin-move-controller.js`: hält die ID des ursprünglich gewählten Pins für die laufende Aktion, prüft den aktiven Modus, koordiniert Vorschau/Abbruch und ruft die Fachoperation **nur bei ausdrücklicher Bestätigung** auf.
- `application/pin-operations.js`: unverändert zuständig für die Validierung und tatsächliche Mutation von Pin-Koordinaten im Projekt.
- `ui/pin-move-preview.js`: unverändert zuständig für temporären Marker, Verbindungslinie und Bestätigungsleiste. Keine gespeicherten Daten.
- `ui/ui-state.js`: unverändert zuständig für vergänglichen UI-Modus (`enterMove`, `leaveMove`).
- `app.js`: verkabelt die Ereignisse und stellt UI-Callbacks für das Ausblenden/Anzeigen des Dialogs, Karten-Neuzeichnen, Speichern und Erfolgshinweis bereit.

Insbesondere werden alte Vorschauen beim Abbruch oder Auswahlswechsel verworfen. Ein im Verschiebemodus zwischenzeitlich gewechselter ausgewählter Pin kann **nicht** versehentlich Ziel einer Bestätigung für den vorher ausgewählten Pin werden. Ohne Vorschau kann keine Position gespeichert werden. Ein bestätigter Vorgang lässt sich nicht ein zweites Mal committen.

Das Modul ist frei von DOM-, Leaflet-, IndexedDB- und Netzwerkzugriffen und setzt auf injizierte Abhängigkeiten. **`app.js`: 370 → 364 Zeilen**. Die Zeilenersparnis ist klein, weil die unverzichtbaren UI-Callbacks nun explizit an der Integrationsstelle stehen.

## Kompatibilität und Cache

Bestehendes Bedienverhalten bleibt Ziel: verschieben nur nach Auswahl eines Pins, Karte oder Vorschau-Marker bestimmen das Ziel, bestätigen speichert, abbrechen verändert keine Daten. `index.html` bindet den neuen Controller vor `app.js` ein. `sw.js` erhöht den obligatorischen Offline-App-Cache auf **`pin2map-new-v24`** und umfasst alle aktuell eingebundenen lokalen Skripte.

## Technische Prüfung

- Neu: `tests/pin-move-controller.test.js`, **acht** Tests für Start ohne Pin, Vorschau ohne Mutation, Abbruch, fehlende Vorschau, einmalige Bestätigung, Auswahlwechsel, ungültige Koordinaten und ignorierte Vorschau außerhalb des aktiven Modus.
- Isoliert in einer testkompatiblen JS-Umgebung ausgeführt: **8/8 erfolgreich**.
- Syntax der betroffenen JavaScript-Dateien und statischer Abgleich aller eingebundenen Skripte mit der Offline-Cache-Liste: erfolgreich.
- **Weiter offen:** vollständiger GitHub-Actions-/Node-Testlauf, Integrationstest mit realem Browser, mobile Pin-Gesten und PWA-Offline-Neustart. Kein Merge oder Produktionsfreigabe.

## Nächster Schritt

Die modulare Basis für Pin-Interaktion ist weitgehend vorhanden. Die nächste sinnvolle Aktivität ist **ein zusammenhängender Browser-Regressionsdurchlauf** der bisherigen Änderungen (Pin-Auswahl, Pin-Dialogrand, Langdruck, Verschiebevorschau, Abbruch/Bestätigung, Ebenen-Sichtbarkeit, Offline-Start), bevor weitere UI-Controller ausgegliedert oder die Oberfläche nach der Vorgänger-App gestaltet werden.
