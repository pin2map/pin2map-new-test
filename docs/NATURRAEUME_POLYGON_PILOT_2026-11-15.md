# Polygon-Pilot Naturräume – RESOLVE 2017 (15.11.2026)

**Status: geprüfte Machbarkeit / Datentest, noch keine Integration in die produktive Gebietssuche.** Anlass: fachliche Entscheidung, ausschließlich **fertige Polygone** ohne API-Keys und ohne erfundene geometrische Grenzen zuzulassen. Das bestehende Rasterkachel-/Leaflet-Kartenkonzept wird nicht geändert.

## Quellen und Rechte

- Primärdatensatz: **RESOLVE Ecoregions 2017**, Dinerstein et al. (2017), **CC BY 4.0**, 846 terrestrische Ökoregionen. Primärdownload, vom Gazetteer dokumentiert: https://storage.googleapis.com/teow2016/Ecoregions2017.zip .
- Für den tatsächlichen Prüfzugriff genutzt: öffentlich lesbares Repository **CatalogueOfLife/col-gazetteers**, `teow/labels.tsv` und `teow/features/{ECO_ID}.geojson`: https://github.com/CatalogueOfLife/col-gazetteers/tree/main/teow . Die Geometrien wurden dort bereits in GeoJSON/EPSG:4326 umgesetzt und mit Douglas–Peucker **0,005°** vereinfacht. Quelle: `teow/README.md` und `ATTRIBUTIONS.md`. Das Repository weist **847 Features** aus: 846 Ökoregionen + `ECO_ID=0` („Rock and Ice“). Gesamtgröße der Gazetteer-Features laut Anbieter **38 MB**. Die GeoJSON-Daten übernehmen die Quell-Lizenz CC BY 4.0; Apache 2.0 des Gazetteer-Projektcodes gilt **nicht** automatisch für diese Daten.
- Weiteres öffentliches, ausdrücklich ohne Login zugängliches vereinfachtes GeoJSON-Archiv mit **846 Features** (Rock and Ice ausgeschlossen): https://drawonamap.com/datasets/terrestrial-ecoregions-world/ ; dortiger vollständiger GeoJSON-Download ca. **8,6 MB**. Für Datentreue und Grenzen sind diese nochmals vereinfachten Shapes vor einer Produktionsentscheidung gesondert zu beurteilen.
- Kein API-Key bei Zugriff auf öffentlich angebotene Dateien notwendig. Eine **regelmäßige Laufzeitabhängigkeit** von GitHub-/Fremdserver-Downloads ist **nicht** vorgesehen: zur späteren Integration ausgewählte, lizenzkonform attribuierte Datensätze kontrolliert aufbereiten und versioniert aus eigener Infrastruktur bereitstellen. Es wurden **keine** Kartendienste oder API-Key-Anbieter eingebunden.

## Tatsächlich ausgeführte technische Prüfung

**Quelle:** Die 14 angegebenen Features wurden einzeln mit `mcp__GitHub__fetch_file` aus dem Original-Gazetteer in den isolierten JavaScript-Testkontext geladen und als JSON geparst. Für jeden Datensatz wurde geprüft: GeoJSON `Polygon/MultiPolygon`, Koordinaten `[longitude,latitude]` in gültigem WGS84-Wertebereich, `LICENSE=CC-BY 4.0`, und Kompatibilität mit den tatsächlich aus dem Feature-Branch geladenen `domain/area-geometry.js` (`pointCount`, `prepare({touchDevice:true})`) und `domain/project-features.js` (`createArea(state,...,\"private\")`). Alle 14 Features bestanden diese gezielten Prüfungen. **Keine** Nutzerdaten, IndexedDB, Branch-Code oder echte App-Preview wurden dadurch verändert.

| ECO_ID | Name aus `ECO_NAME` | GeoJSON | Stützpunkte | pin2map-Geometrie/Privat-Objekt |
|---:|---|---|---:|---|
| 689 | Alps conifer and mixed forests | Polygon | 763 | PASS |
| 676 | Pyrenees conifer and mixed forests | Polygon | 368 | PASS |
| 513 | Venezuelan Andes montane forests | Polygon | 1.472 | PASS |
| 751 | Eastern Himalayan alpine shrub and meadows | MultiPolygon | 3.570 | PASS |
| 193 | Australian Alps montane grasslands | MultiPolygon | 2.841 | PASS |
| 758 | Mediterranean High Atlas juniper steppe | MultiPolygon | 308 | PASS |
| 41 | Drakensberg grasslands | MultiPolygon | 7.587 | PASS |
| 578 | Patagonian steppe | MultiPolygon | 3.041 | PASS |
| 822 | East Sahara Desert | Polygon | 477 | PASS |
| 505 | Southwest Amazon moist forests | MultiPolygon | 5.990 | PASS |
| 366 | Sierra Nevada forests | Polygon | 842 | PASS |
| 692 | Carpathian montane forests | MultiPolygon | 956 | PASS |
| 1 | Albertine Rift montane forests | MultiPolygon | 6.848 | PASS |
| 309 | Eastern Himalayan subalpine conifer forests | MultiPolygon | 3.621 | PASS |

**Wichtig:** PASS bedeutet technische Verarbeitbarkeit des tatsächlichen Ökoregions-Polygons, **nicht**, dass es die vollständige geografische Fläche „Alpen“, „Anden“, „Himalaya“ oder „Sahara“ geometrisch definiert. Die Quelle klassifiziert Ökosysteme, keine einheitlichen Gebirgsgrenzen. Die getesteten Geometrien bleiben vereinfacht; topologische und komplette Browser-/Speicher-/Performance-Tests sind damit noch nicht erledigt.

## Tatsächliche Namensinventur aus allen 847 `teow/labels.tsv`-Zeilen

Die folgende Tabelle ist eine **Groß-/Kleinschreibung ignorierende Teilwortsuche in exakt den Originalnamen**, noch **kein** geprüfter deutscher Alias-Abgleich oder geografischer Summen-Polygon-Nachweis.

| Prüfname | Passende englische Originalnamen | Fazit |
|---|---:|---|
| Alpen (`alps`) | 2 (Europa und **Australian Alps**) | Disambiguierung nach Kontinent zwingend |
| Pyrenäen (`pyren`) | 1 | Vorhandene Ökoregion, kein vollständiger physischer Gebirgsumriss |
| Anden (`andes` plus `andean`) | 8 | Mehrere unterschiedliche Ökoregionen; keine automatische Gesamtvereinigung |
| Himalaya (`himalay`) | 10 | Unterschiedliche Höhen-/Vegetationsstufen |
| Rocky Mountains (`rockies`) | 3 | Der Ausdruck `rocky` allein findet **0**, Alias erforderlich |
| Atlas (`atlas`) | 1 | Hochatlas-Teilökoregion |
| Great Dividing Range (`dividing`) | 0 | Kein direkter Originalnamen-Treffer |
| Odenwald | 0 | Nicht ausreichend granular |
| Schwäbische Alb (`swabian`) | 0 | Nicht ausreichend granular |
| Harz | 0 | Nicht ausreichend granular |
| Heckengäu | 0 | Nicht ausreichend granular |
| Strohgäu | 0 | Nicht ausreichend granular |
| Baar | 0 | Nicht ausreichend granular |
| Sierra Nevada | 1 | Namensmehrdeutigkeit USA/Spanien gesondert prüfen |
| Karpaten (`carpath`) | 1 | Teilökoregion vorhanden |
| Drakensberge (`drakensberg`) | 2 | Getrennte Ökoregionen |
| Patagonien (`patagon`) | 1 | Patagonia steppe ist **nicht** ganz Patagonien |

Die Originalnamen liegen **auf Englisch** vor. Deutsche Alias-Namen sind eine separate Fach-/Kuratoraufgabe mit geographischer Disambiguierung, nicht bloß automatische Teilstring-Suche. Keine beliebige Kombination von Nachbarökoregionen als angeblich „offizielles“ Gebirge anbieten.

## Entscheidungsvorlage / nächster sicherer Schritt

1. **Raster-Hintergrund bleibt unverändert.** RESOLVE-GeoJSON ist eine **eigenständige abfragbare Geometriequelle**, keine Grundkarte und kein Kachelprovider.
2. Ein interner, nicht standardmäßig aktiver **Pilot für eine kleine feste Auswahl exakter RESOLVE-Namen/IDs** kann nach separater Abnahme aus eigenen statischen Dateien die bekannten GeoJSON-Polygone als **pinke, temporäre Vorschau** präsentieren. Ohne jegliche Speicherung vor explizitem Speichern, alle Quellen/Lizenzen in Treffer-Metadaten transparent.
3. Vor öffentlicher Integration: Detailgeometrie / Vereinfachung / Dateigröße / iPhone-Performance testen, Datenattribution und Weitergabe verifizieren, eindeutige Namenszuordnung und Mehrfachgebiete klären.
4. Für Odenwald, Schwäbische Alb, Harz, Heckengäu, Strohgäu und Baar **weitere Quellen mit echten fertigen Polygonen** suchen (z.B. amtliche Naturräume). Wenn nichts belastbar vorhanden ist, **kein** Punkt-, Linien- oder Ersatzpolygon anbieten; stattdessen „Keine geprüfte Gebietsfläche gefunden“.
5. Key-pflichtige Anbieter und WMS-Rasterbilder **nicht** als Ersatz für echte Polygon-Daten in den Suchkatalog aufnehmen.

**Testgrenze:** 14 von 847 Geometrieobjekten wurden fachlich/technisch als Stichprobe geprüft. Kein vollständiger Datensatz-Geometrietest, kein neuer Code zur Suche, keine Live-/Pages-Preview-Änderung und keine iPhone-Abnahme. Diese Ergebnisse sind ausdrücklich ein Datenquellenpilot, keine Produktfreigabe.
