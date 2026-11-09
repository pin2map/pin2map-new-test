# Eigener Stuttgart-PMTiles-Ausschnitt – Phase 1

Stand: 2026-11-09. **Build vorbereitet, noch nicht als erzeugt oder veröffentlicht bestätigt.**

## Zweck

Eigener **kleiner, reproduzierbarer Testausschnitt** für den Protomaps-v4-Kartenstil. Keine Live-Kartenänderung und noch kein Offline-Speicher.

- Quellarchiv (versionierter v4-Mirror): `https://data.source.coop/protomaps/openstreetmap/v4.pmtiles`
- Auszug: `9.12,48.72,9.25,48.82` (W,S,E,N; Stuttgart-Innenstadt)
- Maximaler Kachelzoom: `12` (bewusst keine straßengenaue Vollauflösung)
- Ausgabe: `stuttgart-z12.pmtiles`
- CLI: `github.com/protomaps/go-pmtiles@v1.31.2`
- Maximal zulässige Ausgabegröße: 80 MiB
- GitHub Actions: `pin2map/pin2map-maplibre-preview/.github/workflows/build-stuttgart-pmtiles.yml`
- Ergebnis: nur GitHub-Actions-Artifact `stuttgart-pmtiles-z12` (14 Tage); **keine automatische Veröffentlichung**
- Beigaben: Source-/Extract-Header, PMTiles-Metadaten, SHA256SUMS, README

## Reproduzierbarer CLI-Aufruf

```bash
pmtiles show https://data.source.coop/protomaps/openstreetmap/v4.pmtiles --header-json
pmtiles extract \
  https://data.source.coop/protomaps/openstreetmap/v4.pmtiles \
  stuttgart-z12.pmtiles \
  --bbox=9.12,48.72,9.25,48.82 --maxzoom=12 --download-threads=4
pmtiles verify stuttgart-z12.pmtiles
pmtiles show stuttgart-z12.pmtiles --metadata
```

Quelle: <https://source.coop/protomaps/openstreetmap/v4.pmtiles> (Source Cooperative). Dies ist eine ältere, stabil adressierbare v4-Ausgabe, **nicht** der jeweils aktuelle Protomaps-Planet. OSM-/Protomaps-Namensnennung erforderlich.

## Weitere Freigabeschritte

1. GitHub Actions nachsehen: Wurde der Workflow tatsächlich ausgeführt und erfolgreich abgeschlossen?
2. Exakte Archivgröße, Version und Layer-Metadaten aus dem Artifact prüfen. Keine Datei auf Pages bereitstellen, bevor die Quelle geprüft wurde.
3. Kleine Datei in kontrolliertem Hosting mit HTTP-Range-Requests veröffentlichen. GitHub Pages eignet sich für begrenzte Tests, nicht automatisch für beliebig große Offline-Regionen.
4. Vollständigen Protomaps-Light-Stil einschließlich `glyphs` und `sprites` gegen dieses Archiv testen.
5. Erst danach Download-/Offline-Datenhaltung konzipieren: dauerhafte, bewusst ausgelöste Regionen-Downloads, lokale Dateiverwaltung, Quota-/Eviction-Strategie auf iOS, lokale Fonts/Sprites, Versionierung und Integritätsprüfung.

**Wichtig:** Die erfolgreichen MapLibre-Integrationsstände bleiben in `reference/maplibre-full-integration-accepted-2026-11-09` und im Preview-Repository `reference/maplibre-integration-v2-accepted-2026-11-09` gesichert. `pin2map-new-test/main` und die Leaflet-V18-Referenz bleiben unberührt.

## Umsetzungsstand – zweite Prüfrunde (2026-11-09)

- Offizielle Quelle und CLI-Syntax erneut überprüft: Source Cooperative listet das v4-Archiv unter dem verwendeten Pfad, `pmtiles show`, `extract --bbox --maxzoom --download-threads` und `verify` sind dokumentierte CLI-Befehle.
- **Buildkorrektur:** `go install github.com/protomaps/go-pmtiles@v1.31.2` liefert unter Go den Paket-Binärnamen `go-pmtiles`. Der Workflow erstellt bei Bedarf einen Link `pmtiles` und führt `pmtiles version` vor dem Zugriff auf das entfernte Archiv aus. Damit vermeiden wir einen `pmtiles: command not found`-Fehler.
- **Workflow-Status weiterhin unbestätigt:** GitHub-Connector ermöglicht Dateiprüfungen, liefert hier aber keine Push-getriggerten Workflow-Runs; kombinierte Commit-Statusabfrage ergab keine Einträge. Auch ein externer Browserabruf des Actions-Laufs war nicht möglich. Wir haben daher **weder einen erfolgreichen Lauf noch eine erzeugte Datei verifiziert**.
- Als nächste unabhängige Prüfstufe liegt die **lokale Dateiauswahl** im Preview-Repository unter `https://pin2map.github.io/pin2map-maplibre-preview/pmtiles-local-file-check.html`. Sie liest eine vom Nutzer im Browser gewählte `.pmtiles`-Datei über `pmtiles.FileSource`, ohne sie hochzuladen. Der Test verwendet den Protomaps-Light-Stil mit **externen** Glyph-/Sprite-Dateien; er ist kein autonomer Offline-Betrieb und noch nicht auf iOS getestet.
- Erst nach nachgewiesen erfolgreicher Extraktion und einem Dateitest kann eine kleine selbst gehostete Region für den integrierten MapLibre-Stand freigegeben werden.

## Automatische Abnahmeprüfung im Build

Der GitHub-Actions-Workflow wurde am 2026-11-09 um folgende technische Prüfschritte erweitert:

- `pmtiles verify` prüft die innere Archivstruktur.
- Die aus `pmtiles show --header-json` gelesenen Daten müssen eine Vektorkarte (`tile_type=mvt`), konsistente Zoomgrenzen und eine räumliche Überlappung mit dem Stuttgarter Testgebiet ausweisen.
- Die Datei muss zwischen 127 Byte und 80 MiB groß sein. Eine Überschreitung führt zum Buildfehler statt zu einer stillschweigenden Veröffentlichung.
- Metadaten werden als JSON kontrolliert; die tatsächliche Datei erhält eine SHA-256-Prüfsumme.
- Im GitHub-Actions-Lauf wird eine `GITHUB_STEP_SUMMARY` mit Größe, Bounds, Zoomgrenzen, Typ und Prüfsumme ausgegeben. Nur nach Erfolg wird das Archiv als `stuttgart-pmtiles-z12` hochgeladen.
- Die Quelladresse, die Geo-Bounds, der Zoom-Deckel und die CLI-Version bleiben unverändert. Eine Veröffentlichung auf GitHub Pages erfolgt weiterhin nicht.

**Status:** Workflow-Datei ist in GitHub gespeichert, aber ein tatsächlich erfolgreicher Workflow-Lauf und ein herunterladbares, verifiziertes Artifact sind mit der verfügbaren Schnittstelle noch nicht belegbar. Es wird ausdrücklich keine fertige PMTiles-Karte behauptet.

**Lauf prüfen:** [GitHub Actions – Stuttgart PMTiles](https://github.com/pin2map/pin2map-maplibre-preview/actions/workflows/build-stuttgart-pmtiles.yml). Ein erfolgreiches Ergebnis zeigt eine grüne Markierung, eine Build-Zusammenfassung und das Artifact `stuttgart-pmtiles-z12`.

## Bestätigter GitHub-Actions-Build #3 (2026-11-09)

Der Nutzer hat die vollständige GitHub-Actions-Zusammenfassung und den Artifacts-Bereich des erfolgreichen Laufs übermittelt:

- `stuttgart-z12.pmtiles`, **2.866.574 Bytes = 2,73 MiB**.
- Vektorkacheln `mvt`, Zoomstufen **0–12**.
- Kartengrenzen W/S/E/N: `9.12000,48.72000,9.25000,48.82000`.
- SHA-256: `d3eec669bd7556d96d939933c3e5253e9d174857fd67c137888607d00366a80d`.
- `PMTiles verify: Passed`.
- GitHub-Actions-Artefakt **`stuttgart-pmtiles-z12`** ist tatsächlich vorhanden; GitHub zeigt für das komprimierte Artefakt ungefähr **2,74 MB** an.
- Veröffentlichung: **Not published: Actions artifact only**. Dies ist noch keine produktive, öffentlich gehostete oder offlinefähige Karte.
- Im erfolgreichen Lauf sind Warnungen zur Node.js-20-Abkündigung und zum Go-Cache sichtbar. Diese haben den Lauf nicht verhindert.

**Nächster Schritt:** Artifact als ZIP herunterladen und entpacken, darin `stuttgart-z12.pmtiles` auswählen unter `https://pin2map.github.io/pin2map-maplibre-preview/pmtiles-local-file-check.html`. Die Testseite nutzt den lokalen Browser-`FileSource` ohne Datei-Upload; Fonts/Sprites werden noch online geladen. Erfolg des lokalen Dateitests ist noch nicht bestätigt.

## Erfolgreicher lokaler Kartentest (2026-11-09)

- Nutzer hat Screenshot der isolierten Seite `pmtiles-local-file-check.html` nach Auswahl der selbst erstellten `stuttgart-z12.pmtiles` geschickt. Die Seite meldet ausdrücklich: **„stuttgart-z12.pmtiles geöffnet · Protomaps Light · Zoom 0–12“**.
- Sichtbar sind der vollständige Protomaps-Light-Kartenstil mit Wasser, Straßen, Gebäuden, Grünflächen und Beschriftungen einschließlich Stuttgart und mehrerer Stadtteile/Ortsnamen.
- Die gesamte technische Kette – eigener Extrakt aus Protomaps-v4-Quelle, PMTiles-Verifizierung im GitHub-Actions-Build, Übergabe über lokale Datei und Browserdarstellung mit MapLibre – ist damit erstmals auf dem getesteten Gerät bestätigt. Die Nutzerdatei wird in der Testseite nicht hochgeladen und nicht persistent gespeichert.
- **Keine Offline-Freigabe**: Protomaps-Schriftarten, Symbole, MapLibre/PMTiles-Bibliotheken kommen noch über externe Online-URLs. Die Sichtbarkeit bei Netzwerkverbindung besagt nicht, dass die Testseite offline startet.
- Nächste Arbeitspakete: lokale stabile Ressourcenbereitstellung für JavaScript/Styles, benötigte `glyphs` und `sprites` bundeln, danach gezielter Flugmodus-Test; erst dann Integration in die abgesicherte MapLibre-PWA.

## Detaildiagnose und separat erzeugte z15-Alternative (2026-11-09)

- Der Nutzer hat die Detailarmut der z12-Karte nachgewiesen (fehlende Straßennamen, wenige hochauflösende Objekte). Die Ursache ist nicht allein fehlende Beschriftung: Datenarchiv endet auf Zoomstufe 12, höheres Zoom ist nur Vektor-Overzoom; der Protomaps-Light-Stil hat eigene Zoom- und Kollisionsregeln.
- Neuer **getrennter** Workflow `build-stuttgart-detailed-pmtiles.yml` für `stuttgart-z15.pmtiles` (Stuttgart BBox 9.12,48.72,9.25,48.82; Datenzoom 0–15), Größe begrenzt auf 200 MiB, Integritätsprüfung und eigenes Artifact `stuttgart-pmtiles-z15`. Alte funktionierende z12-Version nicht überschrieben.
- Für einen kontrollierten Stilvergleich besitzt das isolierte Offline-Labor die Option `Mehr Straßennamen (Test)`. Im Stil wird ab Kartenzoom 13 eine zusätzliche `symbol`-Ebene aus den Protomaps-`roads`-Vektoren verwendet. Mit Textkollisionen verbleiben möglicherweise Lücken; nur vorhandene `name`-Attribute können angezeigt werden.
- Vor abschließender Entscheidung z15-Dateigröße, tatsächliche Detailverbesserung und iPhone-Leistung testen. Keine automatische Übernahme des Detailmodus oder Archivs in produktives pin2map.
