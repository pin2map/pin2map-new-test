# Forschungsstufe 2 – Metadaten-zuerst und lazy Polygonprüfung (18.11.2026)

**Status:** isolierter, kontrollierter Forschungsprototyp. **Keine Änderung des laufenden v264-Gebietssuchverfahrens.** Die PWA wird für diesen Test nicht modifiziert; kein fremdes Polygon wird im Repository gespeichert.

## Frage

Kann ein leichter geografischer BBox-Index sofort zunächst nur **unbestätigte Gebietskandidaten** nennen, die vollständigen GeoJSON-Polygone erst nach einer Auswahl abrufen und die einmal geladenen Geometrien im Arbeitsspeicher für weitere Klicks wiederverwenden?

## Neue echte Testfälle – unabhängig von den ursprünglichen 15

Vier **neue, aus fertig vorliegenden Polygonen abgeleitete Innenpunkte** (nicht ursprünglich vom Nutzer vorgegebene Koordinaten) aus RESOLVE 2017, bereitgestellt über CatalogueOfLife/col-gazetteers `teow/features/{ECO_ID}.geojson`:

- ECO689, Alpen (conifer and mixed forests), 46.094857 N, 10.656262 E
- ECO676, Pyrenäen (conifer and mixed forests), 42.736939 N, 0.6513175 E
- ECO751, östlicher Himalaya (alpine shrub and meadows), 28.591939 N, 90.9885605 E
- ECO513, venezolanische Anden (montane forests), 8.6744224 N, 70.75146435 W

**Wichtige Unterscheidung:** Diese vier Punkte wurden **mit Kenntnis der ursprünglichen Polygongeometrien** gewählt. Das ist ein echter geometrischer Nachweis des neuen Metadaten-/Lazy-Load-Mechanismus, **kein Blindtest**, keine weltweite Suchabdeckung und keine exakte Gebirgsgrenzen-Behauptung. Ökoregion ≠ vollständiger Umriss eines Gebirges.

Originaldaten: [CatalogueOfLife col-gazetteers / teow](https://github.com/CatalogueOfLife/col-gazetteers/tree/main/teow), Primärdaten RESOLVE 2017; **CC BY 4.0** (Quell-Lizenz für Polygone, nicht die Apache-2.0-Lizenz des Gazetteer-Codes). Die bereits publizierten Geometrien sind vereinfacht, was vor produktiver Verwendung offengelegt werden muss. Die vier versionierten Metadaten enthalten nur ID, Name, Gebietstyp, Quelle und das aus den Originalen ermittelte BBox-Rechteck sowie die neuen Testkoordinaten, keine Originalpolygone.

## Implementierte Hypothese und Prüfungen

`research/area-metadata-index.cjs` trennt drei Zustände:

1. `candidates(lon,lat)`: Gibt ausschließlich BBox-Kandidaten als `status:"unverified"` zurück, ohne Netzabruf und ohne fälschliche `containsPoint`-Behauptung. Grobe Zellindizierung und separater Fallback für große BBoxen; festes maxCells-Budget.
2. `verify(id,lon,lat,load)`: Lädt GeoJSON nur für eine ausgewählte ID über einen injizierten Provider, prüft Polygon-/MultiPolygon-Typ, übereinstimmende BBox, danach den produktiven reinen Geometrie-Port `Pin2MapAreaGeometry.containsPoint`. Eine lediglich in der BBox liegende Fläche wird **nicht** als getroffen ausgegeben.
3. In-Memory-Cache: für denselben Polygon-ID-Abruf nur ein laufender Request, Warmstart ohne weiteres Laden, explizite Cache-Leerung möglich. Fehler erhalten keine falschen positiven oder dauerhaften Caches.

`tests/area-metadata-index.test.js` prüft zusätzlich synthetische **falsche BBox-Treffer**, Polygonlöcher, Überlappungskandidaten, gleichzeitige Anfragen, erneuten Zugriff aus dem Cache, Recovery nach Provider-Fehler sowie Ablehnung nicht unterstützter Datumsgrenzen-BBoxen.

Der gesonderte Research-Workflow `.github/workflows/area-metadata-research.yml` lädt nur vier einzelne echte GeoJSON-Dateien über GitHub-Raw, einzeln auf die jeweilige getestete Fläche bezogen. Er misst Metadatenmenge, tatsächlich übertragene GeoJSON-Bytes, Kalt-/Warm-Verarbeitung und die echte `containsPoint`-Prüfung – keine photon-/nominatim-/overpass-Anfragen, keine systematischen Massenabrufe. Ausgabe als GitHub-Actions-Joblog, **nicht** als neu veröffentlichte Gebietsgeometrie.

## Forschungsgrenzen / erforderliche nächste Entscheidung

- Die BBox stammt hier bereits aus der bekannten Geometrie. Ein weltweit durchsuchbarer Index benötigt eine **separat kuratierte und aktualisierte Quelle vollständiger Gebiets-Metadaten und Geometrie**. Gerade diese Versorgung, Aktualität, topologische Qualität und Lizenz-/ODbL-Konformität sind noch offen.
- Der erste Kandidat darf nie als bewiesene Fläche erscheinen; bei überlappenden Daten zuerst mehrere potenzielle Kandidaten anzeigen, dann exakte Geometrien laden; in Produktions-UI Zusatzresultate nachladen.
- Die gemessene GitHub-Raw-Latenz ist **keine Schätzung** der Photon-/OSM-Produktivlatenz oder mobilen Safari-Dauer. Nur vier kontrollierte Flächen; keine p95-Weltmessung.
- Antimeridian-überschreitende BBoxen werden bewusst mit Fehler abgelehnt; später müssen sie in zwei Rechtecke geteilt werden. Langzeit-/Offline-Cache, Versionierung und Client-Quota wurden nicht implementiert.
- Kein Eingriff in `main`, `reference/*`, Nutzerdaten oder IndexedDB. Der bestehende v264-Worker bleibt unverändert.

Nach erfolgreichen Gates: Metadatenindex für eine größere, fachlich ausgewogene Menge realer Schutzgebiete, Gewässer und administrative Flächen mit **unbekannten Vorab-Klickpunkten** beschaffen und die Vollständigkeit gegen unabhängige Referenzen bewerten. Nur mit rechtlich und technisch geklärtem Provider darf eine produktive Integration erwogen werden.

### GitHub Raw-Datenpfad – reale erste CI-Diagnose und Anpassung

Der erste Forschungsrun [44313086788](https://github.com/pin2map/pin2map-new-test/actions/runs/44313086788) scheiterte nach **6/6 erfolgreichen Modulregressionen** beim realen Dateiabruf `raw.githubusercontent.com/.../689.geojson` mit **HTTP 404 im GitHub-Runner**. Der GitHub-Repository-Contents-Endpunkt für dieselbe öffentlich vorhandene Datei ist über die Projektintegration nachweislich lesbar. Darum wird ausschließlich der Transport auf `api.github.com/repos/CatalogueOfLife/col-gazetteers/contents/...?...ref=main` mit standardmäßigem `base64`-Inhalt umgestellt. Die fachliche `containsPoint`-Prüfung, originalen Metadaten und strikte Datensparsamkeit bleiben identisch; die neue URL ist ein externes Testartefakt, keine App-Provider-Integration. **Der erste Run ist fehlgeschlagen und kein Freigabenachweis.**

### Zweiter echter Zugangsfehler und dritter Prüfweg

Der Folgejob [44313449491](https://github.com/pin2map/pin2map-new-test/actions/runs/44313449491) erhielt für `ECO689` **auch über die GitHub-Contents-API HTTP 404**, nachdem die 6/6 Modultests erfolgreich waren. Live-Messung also erneut **nicht bestanden**; die externe Zugänglichkeit des Datensatzes aus GitHub Actions darf nicht als nachgewiesen gelten. Als eigenständiger dritter Versuch ist ein auf die **vier Dateien beschränkter, read-only, nicht persistenter** `actions/checkout` der Quelle vorgesehen. Der Benchmark liest die Dateien anschließend lokal; ein späteres grünes Ergebnis würde echte GeoJSON-Polygon-/Punktenthaltensein-Verifikation und lokale Kalt-/Warmzeiten, **aber keine gemessene Netzwerklatenz**, belegen. Bei fehlender Checkout-Berechtigung muss der Live-Nachweis ausdrücklich blockiert bleiben.

### Root-Cause-Aufklärung nach dem dritten Run

Die vorigen HTTP-404-Aufrufe waren **kein nachgewiesenes Datenanbieter-Problem**: Der Metadaten-Normalisierer übernahm `record.sourceId` nicht in das interne Indexobjekt. Die beiden direkten Abrufvarianten fragten deshalb tatsächlich `undefined.geojson` an. Im [dritten Run 44314039596](https://github.com/pin2map/pin2map-new-test/actions/runs/44314039596) funktionierte der öffentlich lesbare sparse Checkout; erst der anschließende Dateizugriff auf `teow/features/undefined.geojson` legte den internen Fehler offen. Der Fix übergibt und validiert die numerische Quell-ID und prüft sie künftig explizit im neuen Regressionstest. Die bisherigen Providerausfall-Interpretationen in diesem Forschungsprotokoll sind damit **überholt**. Der folgende Test verwendet weiter den erfolgreich geprüften sparse-Checkout und misst ausschließlich lokale Datei-/Verarbeitungskosten, keine Netzwerklatenz.
