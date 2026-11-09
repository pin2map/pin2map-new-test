# Eigene Oberflächen-Testadresse für die modulare Entwicklung

**Stand:** 2026-11-09 · Quelle: `feature/leaflet-modular-core`

## Adressen

- **Bestehende veröffentlichte PWA (aus main):** `https://pin2map.github.io/pin2map-new-test/`
- **Neue modulare Entwicklungsvorschau:** `https://pin2map.github.io/pin2map-new-test/preview/` (erst nach erfolgreichem GitHub-Pages-Workflow als aktiv betrachten).
- **Entwicklungsquellcode:** `https://github.com/pin2map/pin2map-new-test/tree/feature/leaflet-modular-core`
- **Unveränderter modularer Referenzpunkt:** `reference/modular-core-2026-11-09`.
- **Ältere Leaflet-Referenz:** `reference/leaflet-v18-2026-11-09`.

## So funktioniert die Veröffentlichung

`.github/workflows/preview-pages.yml` reagiert auf Pushes in den Entwicklungszweig (außer reinen docs-/tests-Änderungen) und lässt zunächst Syntax-, Node- und Architekturprüfungen laufen. Anschließend:

1. Checkt **main** in `site-root/` aus – für den bisherigen Website-Startpfad.
2. Checkt den Entwicklungszweig separat nach `preview-source/` aus.
3. Kopiert die Entwicklungsvorschau nach `site-root/preview/`.
4. Isoliert nur **in der veröffentlichten Vorschaukopie** die Datenhaltung und PWA-Caches: Datenbank `pin2map-new-preview-v1`, App-Shell `pin2map-preview-vNN`, eigene Tile-/Metadaten-Caches.
5. Veröffentlicht das Gesamtpaket als **eine** GitHub-Pages-Site und teilt sich die `pages`-Concurrency-Sperre mit dem alten main-Workflow.

Weder `main` noch die Referenzen noch die Entwicklungs-App selbst müssen dafür umgeschrieben werden. Vorhandene Pins im bisherigen Website-Pfad liegen in der Datenbank `pin2map-new-v1` und werden durch die Vorschau nicht überschrieben.

## Grenzen und Vorsicht

GitHub Pages kennt pro Repository nur eine Website. Die zwei URLs sind also **unterschiedliche Pfade derselben Domain**, keine komplett getrennten Web-Ursprünge. Daher sind getrennte IndexedDB- und Cache-Namen zwingend.

**Bei späteren Pushes nach main** startet dessen bestehender Pages-Workflow und veröffentlicht ausschließlich `main`; dabei würde `/preview/` vorübergehend verschwinden. In diesem Fall genügt ein erneuter manueller Lauf von **Deploy modular development preview alongside stable site**, der die Vorschau wieder neben main veröffentlicht. Ein dauerhafterer Doppel-Publishing-Workflow auf main kann später unabhängig geprüft werden; main wird jetzt bewusst nicht geändert.

Der neue Veröffentlichungsworkflow führt Node- und Architekturtests aus, aber keinen echten Chromium-Test im selben Job. Der bereits vorhandene separate Chromium-Gate `Modular core checks` bleibt für die fachliche Freigabe maßgeblich.

Ein erfolgreicher Workflowlauf und ein echter HTTPS-Aufruf der Vorschau müssen vor der ersten Mobilgeräteprüfung nachgewiesen werden. **Bis dahin ist die URL eine vorgesehene Adresse, keine bestätigte Live-Adresse.**

## Danach

Für die Oberflächenentwicklung ausschließlich `feature/leaflet-modular-core` ändern, mobil mit `/preview/` testen, das stabile `main` unangetastet lassen. Zuerst Sichtprüfung (Pin-Dialoge, Ebenenbutton, Marker und Labels, Kartensteuerung, Mobil-Viewport), dann gestufte Wiederherstellung der gewünschten Vorgänger-App-Funktionen.
