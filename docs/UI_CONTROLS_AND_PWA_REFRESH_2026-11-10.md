# pin2map NEW – zentrale Buttonregeln und verlässliche PWA-Aktualisierung

**Stand:** 2026-11-10 · **Zweig:** `feature/leaflet-modular-core`

## Bestehende Festlegung: runde Bedienelemente

Die gemeinsame Gestaltung wurde bereits am **2026-11-09** mit Commit
`a353114c7e` eingeführt: weiße runde Symbolbuttons mit schmalem
neutralem Rand, gemeinsamen Icon-Maßen und einheitlichem Grundstil.
Folgeänderungen hatten diese Architektur durch lokale Größenwerte
(40, 42, 44, 46 px) für Kartenbuttons unabsichtlich durchbrochen.

**Verbindlicher Gestaltungsvertrag (Neufassung 2026-11-10, v50):**

- Geltungsbereich: **jeder runde Button auf der Kartenfläche**, auch künftig
  neu hinzugefügte. Die Regel gilt automatisch für direkte Overlay-Buttons
  in `#app` sowie Buttons innerhalb der Leaflet-Kartensteuerung `#map`.
- **Ausnahmen vom Geltungsbereich**, keine individuellen Ausnahmen:
  Buttons in sämtlichen Dialogen, Panels und Menüs sowie im Suchblock
  erhalten weiterhin ihre eigenen Designs.
- Einheitliche Größe `42 × 42 px`, Hintergrund **hellgrau
  `#f1f3f6`**, Rand **`#b7c5d4`**, Schatten
  **`0 2px 8px #12253a36`**, Vordergrund **`#253a4b`**.
- Beim Betätigen **kurz blau** (`#c9e1ff` für 220 ms);
  anschließende Rückkehr zu Hellgrau, auch bei geöffnetem Menü/Dialog
  oder aktiver Beschriftungsoption. Ein dauerhaft markierter Button ist
  nicht vorgesehen. Der Menü-/Optionszustand bleibt barrierefrei über
  `aria-expanded` oder `aria-pressed` erkennbar.
- Neue Kartenbuttons müssen **keinen individuellen Designblock**
  erhalten; stattdessen in die gemeinsame Kartenbutton-Struktur
  eingebunden werden. Dialog-/Suchbuttons niemals über diese Regel
  mitgestalten.
- **Jede individuelle Abweichung** bedarf einer expliziten Rückfrage
  und Zustimmung des Auftraggebers. Keine stillschweigenden Sonderfarben,
  Schatten, Abmessungen oder gedrückten Zustände.
- Das ist eine verbindliche Anfangsfassung und kann nach gemeinsamer
  Entscheidung verfeinert werden. Regressionstests prüfen die Regel.

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
