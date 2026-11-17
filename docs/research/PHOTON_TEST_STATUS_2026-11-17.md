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


## Echttest erfolgreich abgeschlossen – 17.11.2026

**Run:** https://github.com/pin2map/pin2map-new-test/actions/runs/44141987357 · **Workflow-Commit:** `a7c2b3a1fd27dbb996138db99d05cd8bb7b314f2`.
Alle Job-Schritte `completed/success`, einschließlich tatsächlicher Photon-Anfragen, Commit-Rückkanal und Ergebnis-Artefakt. Vollständige 15-Punkte-Metadaten: [photon-15-coordinates-result.json](photon-15-coordinates-result.json). Der früher in diesem Dokument vermerkte fehlende Ergebnisabruf ist **historisch und jetzt aufgelöst**.

**Messzahlen:** 15/15 Reverse-Anfragen HTTP 200, 0 Netzwerkfehler; 7/15 vom Skript direkt erkannte vollständige bzw. enthaltene Namensübereinstimmungen, 0/15 Polygon-/MultiPolygon-Antworten. Die Testauswertung betrachtet zusätzlich übersetzte Ortsnamen, für die kein automatisierter Identitätsbeweis vorliegt:

| Testpunkt | Photon-Treffer | OSM-Typ und ID | Namensbewertung |
| --- | --- | --- | --- |
| Enoggera Reservoir | Enoggera Reservoir | way/8113068 | Direkt |
| Marradong Mining Area | Marradong Mining Area | relation/14893603 | Direkt |
| Mokamie Nature Reserve | Mokamie Nature Reserve | relation/12949787 | Direkt |
| Delamere Range Facility Training Area | kein Ergebnis | – | Fehlt |
| Lake Kivu | kein namensgleicher Treffer | – | Fehlt |
| Farihy Ihotry | Farihy Ihotry | way/75250501 | Direkt |
| Namib Naukluft National Park | kein Ergebnis | – | Fehlt |
| Embalse Rio Hondo | Embalse Río Hondo | relation/7138909 | Direkt, Akzentvariante |
| Lago Villarrica | Villarrica Lake | relation/1922935 | Übersetzung, zu prüfen |
| Reserva Biológica Huilo Huilo | Huilo-Huilo Biological Reserve | relation/6809830 | Übersetzung, zu prüfen |
| Zona Nucleo Rio Auquinco | Zona Núcleo Río Auquinco | relation/11283391 | Direkt, Akzentvariante |
| Parque Nacional Torres del Paine | kein namensgleicher Treffer | – | Fehlt |
| Tonle Sab | Tonle Sap Lake | relation/5638825 | Abweichender Nutzername, zu prüfen |
| Heaven Lake | Heaven Lake | relation/11650508 | Direkt |
| Tasik Kenyir | Kenyir Reservoir | relation/1166498 | Alternativname, zu prüfen |

**Fachliches Fazit:** Die gemessenen 7 direkten Namensmatches und 4 mögliche mehrsprachige/alternative Matches liefern Kandidaten aus insgesamt 11/15 Punkten, nicht 11 bewiesene identische Flächen. Photon liefert nur `Point`-GeoJSON, bei einzelnen Kandidaten ein `extent`-Attribut (Bounding-Box, kein Polygon). Keine flächige Punktenthaltensein-Prüfung möglich, und Photon ist folglich **kein direkter Overpass-Ersatz**. Die 11 Kandidaten zeigen jedoch, dass ein zweistufiger Ansatz (Photon-OSM-ID → verlässliche lizenzgeeignete OSM-Objektgeometrie → echtes `containsPoint`) prüfenswert ist. Die nächste Untersuchung sollte direkt einzelne OSM-Ways/-Relationen per OSM-ID abrufen, ohne eine globale Overpass-`is_in`-Abfrage zu brauchen, und Geometrie, Identität und Nutzungsrechte getrennt testen. Kein Produktrelease und keine Änderung der v251-PWA.
