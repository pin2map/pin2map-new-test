# pin2map NEW – erste PWA-Testversion

> **Aktueller Einstieg für pin2map NEW (2026-11-10):** [Projektwegweiser](docs/PROJEKTWEGWEISER.md) und [AGENTS.md](AGENTS.md) lesen. Die unten stehende Beschreibung einer „ersten PWA-Testversion“ dokumentiert einen historischen Entwicklungsstand. Aktive modulare Quelle ist feature/leaflet-modular-core; die unveränderte stabile App liegt unter /, die Entwicklungsvorschau unter /preview/. Für Änderungen gilt: **erst nach nachgewiesenen Tests, erfolgreicher Veröffentlichung und Live-Prüfung fertig melden** (siehe [Grundentscheidungen](docs/GRUNDENTSCHEIDUNGEN.md)). Ein Commit allein ist kein Abschluss.


**Entwicklungsstand:** Erste browserbasierte Implementierung. Noch **nicht end-to-end im Browser verifiziert**. Sie setzt die Basisentscheidungen 1–142 im zunächst relevanten Kern um.

## Testen

1. **GitHub Pages:** Unter *Settings → Pages → Build and deployment* die Quelle **GitHub Actions** wählen; dann wird der Workflow `.github/workflows/pages.yml` bei Push nach `main` aktiv. Erwartete URL nach erfolgreicher Einrichtung: https://pin2map.github.io/pin2map-new-test/ (bitte den tatsächlich gemeldeten Workflow-Link kontrollieren).
2. Alternativ die Dateien lokal über einen HTTP-Server bereitstellen, z. B. `python3 -m http.server 8000`, und http://localhost:8000 öffnen. Nicht direkt als `file://` öffnen.
3. Der erste Kartenstart braucht Internetzugriff auf Leaflet (CDN) und die Kartendienste. Pins/Ebenen werden in IndexedDB gespeichert.

## Im ersten Entwicklungsstand implementiert

- Leaflet-Karte mit Straßen- und Topografiekarte, persistiertem Ausschnitt und Zoom.
- Systemebene **Privat** und **Ebene 1**, weitere Ebenen anlegen, aktivieren und ein-/ausblenden.
- Pins mit stabiler ID, WGS84-Koordinaten und Zuordnung zu **genau einer** Ebene; anlegen (Karte antippen), auswählen, Namen bearbeiten, Ebene wechseln, verschieben (per Drag oder Button) und nach Bestätigung löschen.
- Speicherung in IndexedDB, Laden beim Start und nach Browser-Neustart.
- Weltweite **geografische Ortsnamensuche** im sichtbaren Suchfeld: Button/Enter, Liste bei mehreren Treffern, direkte Pin-Erstellung bei genau einem Treffer, Such-Pins immer in **Privat**, Ortsname als editierbarer Name, Kartensprung, Hinweise bei Fehlern/Nulltreffern.
- Geocoding-Adapter für die öffentliche Nominatim-Such-API, lokaler **24-Stunden-Cache**, keine automatischen Anfragen während der Eingabe.

## Nominatim – verbindliche Einschränkung

Die direkte Nominatim-Anbindung ist **standardmäßig deaktiviert** und muss im kontrollierten Test nach Prüfung der Nutzungsbedingungen bewusst über **⚙ Einstellungen** aktiviert werden. Dieses Opt-in **allein** garantiert keine Einhaltung der Richtlinie. Der Browser-Code drosselt nur pro Browser und kann **nicht** die anwendungsweite Grenze über mehrere Testende durchsetzen. Daher **nicht** für breite öffentliche Nutzung freigeben. Die Richtlinie https://operations.osmfoundation.org/policies/nominatim/ verlangt u. a. derzeit höchstens eine Anfrage pro Sekunde insgesamt, geeignete Attribution/Identifikation, keine Autocomplete-Suche und moderate Nutzung. Bei Unvereinbarkeit ist ein geeigneter alternativer Endpunkt erforderlich. Nominatim-Ergebnisse sind nicht offline abrufbar; zuvor zwischengespeicherte Antworten können offline für 24 Stunden wiederverwendet werden.

## Aktuelle Grenzen / nächste Prüfschritte

- **Unverifiziert:** GitHub-Pages-Workflow und Gesamtablauf im echten Browser, mobile Ansicht, CORS der Nominatim-API, Service Worker.
- Erster UI-Test: Pins/Ebenen anlegen, speichern, Seite neu laden, Pin verschieben/löschen, Kartensprung und ausgeblendete Ebene testen.
- Geocoding nur im erlaubten kontrollierten Test prüfen; später eine tragfähige anwendungsweite Anfragerate/Anbieterlösung vor breiter Freigabe bereitstellen.
- Weitere beschlossene Detailfunktionen und Robustheit schrittweise integrieren; serverseitige Synchronisation bleibt später.

## Architektur

`index.html` – UI; `styles.css` – Responsive Layout; `app.js` – Leaflet, Zustandslogik, IndexedDB, Geocoding; `manifest.webmanifest` – PWA-Metadaten; `sw.js` – Cache lokaler App-Dateien; `.github/workflows/pages.yml` – Veröffentlichung.

Verbindliche Anforderungen: [Grundentscheidungen](docs/GRUNDENTSCHEIDUNGEN.md).
