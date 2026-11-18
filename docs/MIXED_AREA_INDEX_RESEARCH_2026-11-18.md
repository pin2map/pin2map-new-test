# Forschungsstufe 3 – gemischte reale Polygone und koordinatenbasierter Index-Gegencheck (18.11.2026)

**Strikter Forschungsscope:** Kein PWA-Import, kein SW-Bump, keine IndexedDB-/Userdatenänderung; das Produkt bleibt v264. Die Daten werden **nur im separaten GitHub-Actions-Runner per begrenztem read-only sparse checkout** geladen. Es werden keine fremden Polygonkoordinaten in unser Repository übernommen.

## Quellen / Lizenzen / fachliche Grenzen

- **Natural Earth, Public Domain**: `nvkelso/natural-earth-vector`: Ländergrenzen `ne_110m_admin_0_countries`, große Seen `ne_110m_lakes`, Fläche `ne_10m_parks_and_protected_lands_area`. Die 1:110-Millionen-Geometrie von Ländern/Seen ist **sehr stark vereinfacht** und eignet sich nicht zur exakten lokalen Grenzentscheidung. Der Schutzgebietsdatenbestand umfasst nur ausgewählte und überwiegend US-bezogene Flächen, also **keine weltweite Schutzgebietsvollständigkeit**. Quelle https://github.com/nvkelso/natural-earth-vector .
- **RESOLVE 2017, CC BY 4.0**: vier echte terrestrische Ökoregionen ECO_ID 689, 676, 751, 513 aus `CatalogueOfLife/col-gazetteers/teow`, bereits vereinfachte GeoJSONs; Quelle https://github.com/CatalogueOfLife/col-gazetteers/tree/main/teow . Eine Ökoregion ist **kein** Gebirgsumriss und **nicht automatisch ein Schutzgebiet**.

Datenlizenzen und Ausmaß der Vereinfachung dürfen später bei Metadaten und Flächenübernahme nicht verborgen werden. Naturschutzgebiets-, Staats- und Seenränder sind nicht dieselben Fachkategorien.

## Forschungshypothese

`research/mixed-area-blind-points.cjs` enthält **36 geografisch vorab definierte** Stadt-, Schutzgebiets-, See-, Insel-/Meer- und Randkoordinaten, sowie weitere **160 deterministisch generierte Weltkoordinaten**. Diese Liste enthält keine erwarteten Polygon-IDs oder Anbieterergebnisse und ist unabhängig vom Indexkandidaten-Ranking. Die Positionen sind kein verifiziert zufällig repräsentatives Stichprobenverfahren; einige Ortsnamen legen mögliche Trefferarten nahe, sind aber keine algorithmischen Treffer-Vorgaben.

`research/mixed-area-live-benchmark.cjs` liest drei Natural-Earth-Dateien und vier RESOLVE-Dateien aus einem einmaligen read-only Source-Checkout in einem separaten Runner. Es bildet einen gemeinsamen **Metadatenindex nur aus ID, Name, Kategorie und BBox**, die aus tatsächlich vorhandenen Geometrien errechnet werden. Danach werden für jede der **196 vorher definierten Koordinaten** zwei **unabhängige** Auswertungen vorgenommen:

1. Alle source-seitig verfügbaren Polygone **ohne Indexfilter** mit dem bestehenden produktiven `Pin2MapAreaGeometry.containsPoint` prüfen (vollständiges Exhaustiv-Oracle für **diesen Datenbestand**).
2. Nur Kandidaten der Zellen-/BBox-Indizierung aus `research/area-metadata-index.cjs` nach separatem `verify` mit Geometrie laden und prüfen. Beide vollständigen, sortierten Polygon-ID-Listen müssen **exakt identisch** sein: kein übersehener oder falsch hinzugefügter Treffer. Gezählt werden zusätzlich BBox-Fehltreffer, Überschneidungen, Typen, Kandidatenzahl, Baseline- und Index-Check-Anzahlen sowie expliziter Warm-Cache ohne neue Ladevorgänge.

Die vollständigen Quelldateien werden **vor** der lokalen Zeitmessung geladen; dieser Versuch ist **kein Netzwerk-, Browser-, iPhone- oder Provider-Latenztest**. Die Ergebnisse zeigen Architekturkorrektheit und lokales Selektionsverhalten, keine globale OSМ-Datenvollständigkeit. Auch die Metadaten entstehen hier zur Laufzeit **aus bekannten Quellpolygonen**: Die flächendeckende, lizenzierte Produktion eines externen Indexes bleibt offen. Schutz vor BBox-Falschpositiven, MultiPolygonen, Löchern und verschachtelten Objekten wird zusätzlich in `tests/mixed-area-index.test.js` und den vorigen Modultests geprüft.

## Nachweise

Das neue Forschungsworkflow-Gate `.github/workflows/mixed-area-research.yml` muss wirklich gegen beide öffentlich verfügbaren Git-Repositories laufen und darf nicht durch generierte Mock-Polygone ersetzt werden. Fehlende Dateien, veränderte Quelltypen oder eine abweichende erschöpfende Trefferliste blockieren den Lauf. Die nach Abschluss erhaltenen Zahlen und CI-/Preview-Run-Links werden im zentralen Projektstatus dokumentiert.

**Bewertung nur nach Messung:** Wenn der Index die vollständige lokale Oracle-Liste exakt rekonstruiert, ist ein größerer gemischter Datenbestand technisch handhabbar. Er beweist **nicht**, dass beliebige weltweite Gewässer, Parks, Sperrgebiete und Verwaltungspolygone bereits vollständig gefunden werden. Nächste Entscheidung: Aktualisierungs- und Lizenzstrategie für einen echten weltweiten polygonfähigen Metadatenkatalog sowie separate Browser-/Netzwerktests unter freigegebenen Nutzungsbedingungen.


## Gemessener Abschluss des echten gemischten Datentests (18.11.2026)

**Maßgeblicher Forschungs-/Test-Commit:** `1170ce8c134d2feb2eec5053ecae17f54896b25f`. **Run:** [Research mixed real polygons 44321940051](https://github.com/pin2map/pin2map-new-test/actions/runs/44321940051) `completed/success`. Die Workflows verwendeten tatsächlich die drei Natural-Earth-GeoJSONs und vier RESOLVE-Features. Der vollständige Index-/exhaustive-Orakel-Vergleich war **für jede der 196 Koordinaten identisch**, einschließlich aller 13 Positionen mit mehreren zutreffenden Flächen.

| Gemessener Wert | Tatsächliches Ergebnis |
|---|---:|
| Vorab ausgewählte benannte Weltpunkte | 36 |
| Pseudorandom-Punkte (fester Seed, Breiten -80° bis +80°) | 160 |
| Quellpolygone: Länder / Seen / geschützte Flächen / Ökoregionen | 177 / 24 / 61 / 4 |
| **Gesamtzahl Polygonobjekte** | **266** |
| Koordinaten mit mindestens einer bestätigten Fläche | 90 / 196 |
| Bestätigte Treffer nach Gebietstyp (Verwaltung / Gewässer / Schutz / Ökoregion) | 90 / 8 / 4 / 1 |
| Koordinaten mit mindestens zwei bestätigten Polygonen | 13 |
| BBox-Kandidaten insgesamt | 247 |
| Davon nach exakter Geometrieprüfung abgewiesene BBox-Fehltreffer | 144 |
| **Geometrische Prüfungen ohne Index** | **52.136** |
| **Geometrische Prüfungen nach Index/BBox** | **247** |
| **Übersehene oder fälschlich ergänzte Polygontreffer im Vergleich zum vollständig untersuchten Datenbestand** | **0** |
| Index-Metadaten in JSON-UTF-8 | 45.704 Bytes |
| Vollständige sieben Quell-GeoJSON-Dateien | 1.198.381 Bytes |
| Grobe Indexzellen / Großflächen-Fallback | 3.291 / 10 |
| Unterschiedliche Geometrien, deren Cache beim ersten Punktdurchlauf tatsächlich geladen wurde | 66 |
| Indexaufbau (einmalig, lokal) | 1,812 ms |
| Metadatenabfragen (196 insgesamt, lokal) | 1,710 ms |
| Exhaustive Geometrieprüfungen (196 insgesamt, lokal) | 41,911 ms |
| Index-Geometrieprüfungen inklusive Cache-/JS-Promise-Overhead (196 insgesamt, lokal) | 4,765 ms |
| Warm-Replay nach Cachebefüllung (196 Koordinaten, lokal) | 2,759 ms |

Die **geometrische Prüfungszahl** sinkt um `(52136 - 247)/52136` = **99,526 %**. Das ist **keine gleich große Reduktion von Antwortzeit, Netzwerkbytes oder RAM**. Es gab in diesem Workflow **keine messbaren HTTP-Downloads während der Abfragen**, da die Geometriedateien vorher über Git ausgecheckt und für das erschöpfende Orakel bereits vollständig geparst worden waren. Die 45,7 KB Metadaten gegenüber 1,198 MB Quelldateien sind ein reiner **Datenrepräsentationsvergleich** (Quelldateien enthalten auch Attribute), nicht ein wirklich gemessener Übertragungsvorteil. Auch die 66 Cacheeinträge stammen aus demselben vorbereiteten Runner-Datensatz.

**Quellenauswahl bleibt unvollständig:** Nur 24 große Natural-Earth-Seen, nur 61 ausgewählte überwiegend US-Schutzflächen und 4 RESOLVE-Ökoregionen. Null Treffer in einem der Datensätze kann **nicht** als „an dieser Koordinate existiert weltweit kein solches Gebiet“ interpretiert werden. Naturraum- und Naturschutzkategorien sind voneinander getrennt. Die 196 Punkte sind unabhängig von den gelieferten Kandidaten-IDs/Sortierungen, jedoch kein unbekannter Full-Planet-Provider-Blindtest mit Vollständigkeitsnachweis.

### Exakt geprüfte technische Freigaben

- [Forschungsrun 44321940051](https://github.com/pin2map/pin2map-new-test/actions/runs/44321940051): Git-Sparse-Checkouts, Node-/Syntax-Checks und echter 196×266-Polygon-Gegencheck **success**.
- [Modular core / Node / Chromium 44321939992](https://github.com/pin2map/pin2map-new-test/actions/runs/44321939992): **success**, bestehende UI-/Such-/Speicherregressionen unverändert.
- [Leaflet modular architecture 44321939903](https://github.com/pin2map/pin2map-new-test/actions/runs/44321939903): **success**.
- [Preview, HTTPS, Live-Chromium, WebKit vor und nach Veröffentlichung 44321939875](https://github.com/pin2map/pin2map-new-test/actions/runs/44321939875): **success** mit allen Jobs.

**Preview:** https://pin2map.github.io/pin2map-new-test/preview/ ; **Service Worker v264 bleibt unverändert**, Forschung ist weder im App-Bundle noch in der lokalen Projektdatenbank. Keine Freigabe/Änderung von `main`.

### Nächste sinnvolle Forschungsphase

Der Algorithmus und die Mehrfachtreffer-Behandlung sind jetzt ausreichend für **diesen** gemischten, bekannten Datenbestand verifiziert. Die eigentliche ungelöste Produktfrage lautet **Katalogbereitstellung**: wie ein aktualisierbarer, lizenzkonformer, möglichst weltweiter Metadatensatz und einzelobjektbezogene GeoJSON-Auslieferung ohne öffentliche Photon-/Nominatim-Massenlast bereitgestellt werden können. Vor einer Integration ist ein repräsentativerer Katalog einschließlich spezifischer OSM-Sperrflächen, Naturschutz-, Gewässer- und Verwaltungsgrenzen nötig; zudem extern gemessene echte Browser-Kalt-/Warm-Latenz, CORS, mobilen Speicherverbrauch und Datenqualität. Die bestehenden Nutzer-Workflows bleiben geschützt.
