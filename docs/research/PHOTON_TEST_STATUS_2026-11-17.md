# Photon – Prüfstand der 15 internationalen Koordinaten (17.11.2026)

## Ziel und Scope
Unabhängiger Forschungstest des öffentlichen Photon-Reverse-Endpunkts mit den unveränderten 15 Nutzerkoordinaten aus `tests/area-source-fixtures.cjs`. **Keine App-/PWA-Änderung** und keine behauptete Polygonfindung durch reine Nähe-Treffer.

## Implementierter Versuch
- Workflow: `.github/workflows/photon-research.yml`; Einführungscommit `ccb542beb7e1bcae5ce6ec5bf40f4233d5a1d6cd`, Ergebnis-Rückkanal `c9097ded7c62862c54b3f4ad360939c05d2be03e`.
- 15 getrennte Reverse-Anfragen, zeitlich gedrosselt (1,8 s Abstand) und mit 15 s Timeout.
- Erfasst Status, Latenz, Ergebnisnamen, OSM-ID/-Typ, Geometrietyp und Namensübereinstimmung; kein Import von Provider-Polygonen.
- Der Job soll seinen JSON-Report inklusive Run-URL unter `docs/research/photon-15-coordinates-result.json` auf dem Feature-Branch bereitstellen.

## Nachweisstatus
Bei mehreren wiederholten direkten GitHub-Dateiabfragen im selben Arbeitslauf ist die erwartete JSON-Ergebnisdatei **noch nicht vorhanden (HTTP 404)**. Die verfügbare GitHub-Integration liefert für den Commit keine Run-ID: `fetch_commit_workflow_runs` filtert laut Toolbeschreibung auf PR-Runs, während dieser Workflow durch Push ausgelöst werden soll. Ein direkter Zugriff auf die GitHub-Actions-Übersicht und auf Photon-HTTP-Anfragen aus dem Arbeitscontainer war nicht möglich. Deshalb **keine 15 erfolgreich ausgeführten Anfragen, keine Trefferanzahl, kein vollständiges CI-Ergebnis behaupten**.

## Fachliche Einordnung und Entscheidungsgate
Photon Reverse ist primär ein nächstgelegenes OSM-Suchelement, keine allgemeine Punkt-in-Polygon-Containment-Suche. Selbst Namens- und OSM-ID-Treffer belegen keine flächenhafte Zugehörigkeit; die vollständige Fläche muss getrennt beschafft und mit `containsPoint` überprüft werden. Für die Ablösung von Overpass verlangt pin2map echte geographische Polygongeometrie, Punktenthaltensein, korrekte Gebietsidentität, geeignete Nutzungsrechte und wiederholte erreichbare Browser-Abfragen.

**Status: Forschungstest vorbereitet, Ergebnisabruf und tatsächliche Messung noch offen. Keine Photon-Eignungsfreigabe.** Die produktive Anwendung verbleibt unverändert auf v251; `main`, `reference/*`, Datenbanken und Service Worker unverändert.
