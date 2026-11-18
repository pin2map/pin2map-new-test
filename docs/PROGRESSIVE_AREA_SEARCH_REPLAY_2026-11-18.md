# Progressive Flächensuche – retrospektiver 15-Punkte-Prototyp (18.11.2026)

## Scope und unveränderliche Quellen

**Forschungsinkrement; keine Produktintegration.** Grundlage ist ausschließlich der tatsächliche erfolgreiche, weltweit verteilte 15-Koordinaten-Lauf vom 17.11.2026: `docs/research/photon-uniform-coordinate-15-result.json` (GitHub Actions [44155277909](https://github.com/pin2map/pin2map-new-test/actions/runs/44155277909)). Unveränderte Benutzerreferenzen: `tests/area-source-fixtures.cjs`.

Neues ausführbares Forschungsmodul `research/progressive-area-replay.cjs`, Regressionen `tests/progressive-area-replay.test.js`. Es verwendet **keine** HTTP-Anfragen, GeoJSON-Downloads, Karten-APIs, Persistenz oder fremde Daten. Es zählt ausschließlich bereits protokollierte OSM-ID-Kandidaten und ausdrücklich als `contained=true` nachgewiesene Polygongeometrien.

## Vergleich: kompletter Lookup vs. progressive Kandidatenauswahl

Die Kandidatenreihenfolge wird unverändert aus der 15-Punkte-Messung übernommen. Die experimentelle Fortschrittsregel lautet: (1) sechs IDs in einer ersten Lookup-Charge, (2) weitere sechs IDs als zweite Charge, (3) auf ausdrückliche Nachfrage die verbleibenden IDs. **Die erwartete Referenz-ID und der Gebietsname werden nie zur Kandidatenreihenfolge oder zum Abbruch verwendet**, sondern ausschließlich retrospektiv zur Trefferqualitätskontrolle.

| Metrik für alle 15 Koordinaten | 1. Charge (6 IDs) | 2 Chargen (max. 12 IDs) | Alle gespeicherten Kandidaten |
|---|---:|---:|---:|
| Lookup-Chargen à max. 6 | 15 | 30 | 56 |
| Wiedergefundene bekannte Referenzflächen | 12/15 | 15/15 | 15/15 |
| Dokumentierte, echt einschließende Polygone | 17 | 21 | 22 |
| Punkte mit mindestens 2 dokumentierten einschließenden Polygonen | 5 | 6 | 7 |
| Stützpunkte dieser *positiv nachgewiesenen* Polygone | 357.635 | 363.672 | 370.332 |

**Retrospektiver Befund:** Die zweite Stufe reduziert die erforderliche maximale Anzahl an Lookup-Chargen in dieser Aufzeichnung von 56 auf 30 (26 Chargen beziehungsweise **46,43 % weniger**). Für die 15 bereits bekannten Gebiete bleibt die Wiederfindungsquote 15/15; **eine nachgewiesene zusätzliche einschließende Fläche bleibt zunächst zurückgestellt**: Beim Punkt Farihy Ihotry fehlt in den ersten zwölf Kandidaten `Morombe` (`MultiPolygon`), das beim vollständigen Durchlauf als weitere einschließende Fläche nachgewiesen war.

### Vorsicht bei der Interpretation

- Die originale Aufzeichnung enthält positive `containing`-Einträge, aber **keine vollständige Geometrie samt Bytegröße/Zeit pro negativen Kandidaten**. Nicht als einschließend protokollierte IDs dürfen nicht ohne Geometrienachweis als `false` eingestuft werden. Die Stützpunktzahlen beziehen sich nur auf sicher nachgewiesene positive Polygone und **sind weder Übertragungsvolumen noch eine Bandbreitenprognose**.
- Die **75 Photon-Anfragen (fünf pro Punkt) werden durch die hier simulierte Optimierung nicht reduziert**. Die tatsächliche Nominatim-Nutzungsrichtlinie, Wartezeiten, Serverlatenzen, Caching und das Durchsatzlimit bleiben bestehen. Ein vermiedener Lookup bedeutet nicht proportional gesparte Sekunden. Der Prototyp setzt `measuredSpeedupSeconds`, `actualTransferBytes` und geschätzte Latenzen ausdrücklich auf `null`.
- Die Qualität ist nur für die **15 vorher vermessenen Kandidatenreihenfolgen** gezeigt; weder globale Vollständigkeit noch Trefferquote bei neuen Koordinaten, bei wechselndem OSM-Index oder bei anderen Suchobjekttypen wird behauptet.
- Ein erster Treffer oder irgendein Punkt-in-Polygon-Treffer ist **kein zulässiges automatisches Abbruchsignal**. Überlappungen (See, Biosphärenreservat, Verwaltungs- oder Schutzgebiet) sind fachlich legitim. Ein zukünftiges UI muss „Weitere Gebiete suchen“ anbieten und kenntlich machen, dass die Liste zunächst unvollständig ist.

## Architektur / nächste technische Entscheidung

1. Die bestehende Nominatim-/Overpass-Suche in `adapters/geocoding/nominatim-area-finder.js` bleibt unverändert. Der Prototyp wird nicht in `index.html` oder `sw.js` geladen. Kein neues IndexedDB-Schema, kein Service Worker Update, keine neue PWA-App-Version.
2. Nach reproduzierbarer CI-Validierung einen **neuen, begrenzten** Live-Benchmark mit geeignetem vertraglich nutzbarem Provider oder eigener Testinstanz planen. Dabei erste sichtbare Metadaten-Zeit, Zeit bis zum ersten *validierten* Polygon, Zeit bis zu mehreren Kategorien, Größenverteilung, p50/p95 und Cache-Warmstart messen.
3. Vor einer öffentlichen Produktintegration steht die Anbieter-/Rate-Limit-Frage. Besonders Nominatim Public und Photon Demo sind keine pauschal freigegebenen Massensuch-Backends. Für interaktive weltweite Nutzung bleibt ein eigener/vertraglich geregelter räumlicher Index mit Metadaten-zuerst-Ausgabe die aussichtsreichere Langfristoption.
4. Tests sollen neben den 15 bekannten Fällen bewusst **neue, vorher nicht als Referenz markierte Koordinaten** prüfen, um retrospektives Überanpassen auszuschließen.

**Freigabegrenze:** Node-/Architektur-Gates für den Forschungscommit verifizieren lediglich den reproduzierbaren Offline-Algorithmus und die Unversehrtheit der App. UI-/Pages-Live- und individuelle Geräte-QS sind für diese **nicht eingebundene** Forschung keine Aussage über eine neue Suchfunktion. Die letzte abgenommene PWA bleibt v264.
