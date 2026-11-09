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
