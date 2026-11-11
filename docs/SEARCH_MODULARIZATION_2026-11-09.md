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

**Historischer Stand (für den Pin-Suchtreffer-Limit ab v137 ersetzt, siehe unten):** Manuelle Suche; 40 Provider-Treffer max.; identische bevorzugte Ortsnamen, direkte Pin-Anlage bei genau einem Ergebnis, Mehrtreffer-Liste; Geocoding ausschließlich nach bewusster Freigabe in den Einstellungen; bereits zwischengespeicherte Treffer bleiben auch ohne API-Freigabe verwendbar. Netzwerkfehler werden als Hinweis gezeigt. Das Nominatim-Opt-in und Browser-Throttling **garantieren keine providerweite Quoteneinhaltung** über mehrere Tester hinweg; keine allgemeine öffentliche Nutzung freigegeben.

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

## Ergänzung 2026-11-11 – v137: geräteunabhängige Treffergrenze und Cache-Versionsvertrag

**Neue, v135 ersetzende Nutzerentscheidung:** Die **normale Pin-Ortssuche** soll auf jedem Gerät denselben Anfragelimit-Wert verwenden. Der zuvor von der Vorgänger-Pin-Suche übernommene Grenzwert **8** ist für NEW aufgehoben. Der einheitliche Nominatim-Anfragelimit-Wert beträgt **25 Treffer maximal**; eine Antwort mit weniger Treffern bleibt möglich und wird nicht künstlich aufgefüllt. Die Zahl 25 aus der Vorgänger-App gehört teils zu anderen Sucharten und belegt nicht, dass eine Geräteunterscheidung eingebaut war.

**Technische Ursache unterschiedlicher Ergebnisse:** v135/v136 Nominatim-Pin-Suche setzte `limit=8`, frühere NEW-Stände verwendeten `limit=40`; `application/place-search-service.js` cachte Treffer bis zu 24 Stunden pro Browser/Endgerät unter dem bloßen Suchtext, **ohne die angefragte Treffergrenze im Cacheeintrag zu speichern**. Daher konnte ein Desktop einen alten 25+-Treffer-Cache anzeigen, während ein iPhone frisch maximal acht Treffer erhielt. Diese Deutung ist anhand Code und beobachteter Differenz plausibel, nicht durch Lesen der privaten Geräte-Caches bestätigt.

**Modulverantwortung:**
- `adapters/geocoding/nominatim-geocoder.js`: einziger Nominatim-Anfragelimitwert `resultLimit=25` (keine Browserweiche).
- `application/place-search-service.js`: Antworten und angezeigte Alt-Caches auf maximal 25 begrenzen; neue Einträge mit `requestLimit:25` markieren; alte Acht-Treffer-Einträge bei zulässiger Online-Suche mit Limit 25 auffrischen. Bei fehlender Freigabe/Offline bleiben die vorhandenen alten Ergebnisse verfügbar, ohne Datenbank- oder Cache-Löschung. Ein alter Cache mit mindestens 25 Treffern wird nur für die Anzeige auf 25 reduziert, nicht destruktiv umgeschrieben.
- `tests/place-search.test.js`: Provider-Parameter, 8-Altcache-/40-Altcache-Verhalten, Offline-Sicherheit und Limitierung unabhängig vom Gerät.
- `tests/preview-live-smoke.cjs`: echte HTTPS-Preview prüft den 25er-Adaptervertrag und die nicht-destruktive Auffrischung synthetischer Alt-Caches auf Phone, Tablet und Desktop.

**Keine absolute Ergebnisidentität:** Nominatim liefert je nach Abfrage, Aktualität und Providerzustand unterschiedliche Anzahlen (maximal 25). Unterschiedliche Suchtexte, gespeicherte Antworten oder deaktivierte Online-Freigabe können weiterhin Unterschiede ergeben. Die **Anfrageregel** ist jedoch geräteunabhängig; identische Treffer zu jedem Zeitpunkt werden nicht vorgetäuscht. Geschützte Nutzerdaten, IndexedDB, Offline-Kacheln und `main`/`reference/*` bleiben unangetastet.
