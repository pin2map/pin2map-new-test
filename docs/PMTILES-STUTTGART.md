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
