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
