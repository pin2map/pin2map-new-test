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
