# Ebenenverwaltung: Modularisierung (feature/leaflet-modular-core)

Die bestehende Bedienung wird unverändert beibehalten. Keine Änderung am gespeicherten Projektformat.

- `application/layer-operations.js`: reine, synchron testbare Ebenenoperationen (Name vorschlagen, anlegen, Löschvorschau, bestätigtes Löschen einschließlich zugeordneter Pins). Die private Ebene wird niemals entfernt.
- `ui/layer-view.js`: reine DOM-Darstellung der Ebenenliste und Ebenenauswahl; Änderungen werden an übergebene Callbacks gemeldet.
- `app.js`: koordiniert Dialogbestätigung, Speicherung, Karten- und Pin-Rendering.
- `application/filter-operations.js`: bislang allein zuständig für Ebenensichtbarkeit. Erweiterte Such-/Filterfelder bleiben ausdrücklich unentschieden.
- `application/routing-service.js`: unabhängige Routing-Schnittstelle ohne Anbieterfestlegung oder aktive Routenberechnung.

Test: `node --test tests/layer-operations.test.js`. Syntax und Browserintegration separat prüfen. Noch kein vollständig verifizierter Browser-/Mobiltest.
