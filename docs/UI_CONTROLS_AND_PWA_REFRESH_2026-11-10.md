# pin2map NEW – zentrale Buttonregeln und verlässliche PWA-Aktualisierung

**Stand:** 2026-11-10 · **Zweig:** `feature/leaflet-modular-core`

## Bestehende Festlegung: runde Bedienelemente

Die gemeinsame Gestaltung wurde bereits am **2026-11-09** mit Commit
`a353114c7e` eingeführt: weiße runde Symbolbuttons mit schmalem
neutralem Rand, gemeinsamen Icon-Maßen und einheitlichem Grundstil.
Folgeänderungen hatten diese Architektur durch lokale Größenwerte
(40, 42, 44, 46 px) für Kartenbuttons unabsichtlich durchbrochen.

**Verbindlicher Gestaltungsvertrag:**
- Für freie runde Karten-/Suchleistenbuttons (Suche, Einstellungen,
  Refresh, Zoom, Fit, Ebenen, Beschriftung) gilt
  `--p2m-map-circle-size:42px`, unabhängig von Gerätebreite.
- Die gesamte tatsächliche Schaltflächenfläche einschließlich Rand
  wird mit derselben zentralen Regel gesetzt; keine neue lokale
  Größenausnahme für einen dieser Buttons anlegen.
- **Dialogbuttons** haben ihre eigenen Größenverträge
  (z. B. `--p2m-pin-dialog-action-size:32px`); sie gehören nicht zu
  den freien Kartenbuttons.
- Änderungen dieser Größen müssen passende Regressionstests erweitern.

## Was ein Klick auf Refresh gewährleisten soll

1. Ungespeicherte Änderungen an Pins und Ebenen zunächst in IndexedDB sichern.
   Bei Speicherfehlern nicht aktualisieren.
2. Die wirklich veröffentlichte `sw.js` ohne HTTP-Cache anfragen
   und die erwartete Versionskennung daraus bestimmen.
3. Registrierten Service Worker mit `updateViaCache:"none"`
   aktualisieren. Das Offline-Paket mit begrenzter Parallelität
   vorladen; bei Installationsfehler die bisherige funktionierende
   Version behalten.
4. Erst nach **verifizierter Aktivierung und Kontrolle** durch genau
   diese Version die aktuelle Browserseite/PWA mit eindeutiger
   Navigation neu laden.
5. Offline- und Installationsfehler eindeutig melden und den
   Refresh-Button wieder bedienen lassen.

Der Aktivierungszeitraum beträgt 90 Sekunden statt der bisherigen
12 Sekunden. Ein bereits offener Tab aktualisiert sein dargestelltes
HTML/JavaScript nicht allein durch eine Service-Worker-Aktivierung.
Ein Klick aktualisiert **das benutzte Fenster**; ein anderes geöffnetes
Fenster wird nicht ungefragt neu geladen, um dortige Eingaben nicht zu
verlieren.

## Veröffentlichungsprüfung

`preview-pages.yml` muss die **exakte Versionskennung** der
veröffentlichten Service-Worker-Datei mit dem Entwicklungszweig
abgleichen sowie die Live-Auslieferung des Refresh-Moduls prüfen.
Ein grüner Modultest allein gilt nicht als Bestätigung der
Veröffentlichung.

## Keine Datenlöschung

Die Aktualisierung löscht weder Projekt-IndexedDB noch Pins oder Ebenen.
Kartenkachel-Caches bleiben von der Codeversionsbereinigung getrennt.
