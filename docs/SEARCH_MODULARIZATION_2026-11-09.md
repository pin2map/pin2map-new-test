# Modularisierung – Ortsnamenssuche (2026-11-09)

**Branch:** `feature/leaflet-modular-core` · **Kein Merge nach main**, kein Eingriff in die geschützte Leaflet-Referenz.

## Bereits vorhandene Grundlage

Die Ebenenverwaltung war bei Beginn dieser Fortsetzung bereits getrennt:
- `application/layer-operations.js`: Ebenen suchen, Namen vergeben, anlegen, gezielt löschen, Privatsystemebene schützen.
- `ui/layer-view.js`: Darstellung der Ebenen und ihrer Interaktionen.
- `tests/layer-operations.test.js`: isolierte Fachtests.

Daher keine doppelte Ebenenimplementierung.

## Neu getrennt: Ortsnamenssuche

1. `domain/place-search.js`: pure Titel-/Detailformatierung, normierte Cache-Schlüssel und Cache-Bereinigung; keine Browser-/API-Abhängigkeit.
2. `adapters/geocoding/nominatim-geocoder.js`: einzige Stelle für Nominatim-URL, HTTP-Anfrage und Validierung; Anbieterwechsel über `search(query,{signal})`.
3. `application/place-search-service.js`: 24h-Cache, 100-Einträge-Grenze, Abbrechen alter Aufrufe, „letzter Suchlauf gewinnt“ und lokale 1100-ms-Drosselung; UI und Storage werden nur über übergebene Callbacks angesprochen.
4. `app.js`: liest die Suchzeile und rendert Ergebnis/Status; enthält keine Nominatim-URL, kein Cachebereinigungs- oder Abbruch-/Throttle-Verfahren mehr.
5. `index.html`: bindet die getrennten Module vor `app.js` ein.

**Fachliches Verhalten beibehalten:** Manuelle Suche; 40 Provider-Treffer max.; identische bevorzugte Ortsnamen, direkte Pin-Anlage bei genau einem Ergebnis, Mehrtreffer-Liste; Geocoding ausschließlich nach bewusster Freigabe in den Einstellungen; bereits zwischengespeicherte Treffer bleiben auch ohne API-Freigabe verwendbar. Netzwerkfehler werden als Hinweis gezeigt. Das Nominatim-Opt-in und Browser-Throttling **garantieren keine providerweite Quoteneinhaltung** über mehrere Tester hinweg; keine allgemeine öffentliche Nutzung freigegeben.

### PWA-Offline-Sicherheit

`sw.js` v20 enthält **alle aktuell von `index.html` eingebundenen lokalen JavaScript-Module** im Installations-Cache (anstatt bisher nur `app.js` und den Kartenadapter). Dies verhindert einen strukturellen Offline-Kaltstartfehler durch fehlende Module. Kein automatischer Kartendownload, keine Änderung an der OSM-Kachelcache-Policy. Aktivierung des neuen Service Workers ist von erfolgreichem Caching sämtlicher Dateien abhängig.

### Tests und offene Prüfpunkte

- `tests/place-search.test.js`: Tests zu Cache, Query, Antwortvalidierung, Trefferformatierung, lokaler Drosselung, Überholen/Abbrechen älterer Suchen, Fehlerfällen.
- `.github/workflows/modular-core.yml`: Syntaxprüfungen aller Module und `node --test tests/*.test.js` auf dem Entwicklungszweig.
- **Noch nicht als erfolgreich nachgewiesen:** GitHub-Actions-Ausführung, vollständiger Browser-/Mobil-/PWA-Offline-Test und reale Nominatim-Interaktion. Keine allgemeine Produktionsfreigabe.
- **Nächster technischer Schritt:** CI-Ergebnisse verifizieren; Suchablauf im Browser und Offline-Start prüfen. Erst danach größere weitere UI-/Fachumbauten.
- **Danach** UI-Orchestrierung in `app.js` weiter entlasten, beispielsweise Marker-/Kartengesten als eigene UI-/Application-Controller. Die späteren Filterfelder sowie Routing-/Gewässer-/Wetteranbieter bleiben unentschieden.

## Ergänzung 2026-11-11 – v135: Pin-Suchergebnis-Vertrag der Vorgänger-App

**Referenzquelle:** `pin2map/pin2map`, `main:index.html`, Funktionen `geocode(q,false)`, `p2mPlaceKind(r)` und `selectPlaceResult(q,results,…)`. Im Vorgänger nutzt die normale Pin-Suche Nominatim `search?format=jsonv2&limit=8&addressdetails=1&q=…` mit deutschem `Accept-Language`. Die zuvor für NEW festgehaltene 40er-Grenze wird **nur für die normale Pin-Suche** durch die ausdrücklich angeforderte Legacy-Parität auf **8 Treffer** angepasst; keine Flächen- oder Gewässersuche verändert.

**Reiner Domain-Vertrag:** `domain/place-search.js` liefert aus Provider-Ergebnissen (a) Name mit `name` vor erstem Segment von `display_name`; (b) vollständiges `display_name`; (c) deutschen Objekttyp anhand `addresstype/type` und `class/category` mit Zeichen `●` für Node, `▧` für Boundary, sonst `▱`, plus `Ortsmittelpunkt` bzw. `Gebiet` für entsprechende Ortstypen; (d) Koordinaten auf fünf Nachkommastellen nur für Treffer mit gleichem Name **und** gleichem `display_name`. In der UI keine duplizierte Fachlogik.

**Port-/Modultrennung:** `adapters/geocoding/nominatim-geocoder.js` besitzt Provider-URL/-Parameter (Limit 8, Sprache de); `application/place-search-service.js` besitzt `cancel()` für bereits laufende, durch Textänderung überholte Anfragen; `ui/search-form.js` behandelt `input`-Änderungen einschließlich Löschen: laufende Suche abbrechen/invalidieren, Liste schließen und späte alte Antworten verwerfen. Ausschließlich Button oder Enter löst eine neue Suche aus. `ui/search-results.js` rendert Treffer mit Typ-Badge, vollständiger Ortsbeschreibung, ggf. Koordinaten; bei Scrollbedarf scrollt nur `.results-items`, die untere `results-footer`-Zeile mit `Abbrechen` bleibt sichtbar. `app.js` verdrahtet diese Ports nur. Anwendungsfall Pin-Anlage bleibt `application/search-pin-transfer.js`, unverändert.

**Abnahme:** v135 GitHub Actions und echte Pages-/HTTPS-/Live-Chromium-Prüfungen erfolgreich (Details im Projektstatus § 4ao). Kein neuer `!important`, keine DB-/Kachel-/Kartenadapteränderung, keine Änderungen an `main` und `reference/*`. Reale iPhone-/iPad-Gesten und Nominatim-Netz-Verfügbarkeit sind getrennt zu behandeln.
