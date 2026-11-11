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

## Zusatzvertrag v139 – Satelliten-Helligkeit und Kontrast (2026-11-11)

**Nutzerbeschluss:** Im bestehenden Kartenarten-Dialog ist „Satellit“ die letzte Kartenart direkt **oberhalb** der durch die Trennlinie abgesetzten „Schummerung“; „Humanitarian“ steht unmittelbar davor. Unter der Option Satellit und über der Schummerung werden zwei Regler eingeblendet: „Helligkeit“ mit Lucide **`sun-medium`**, „Kontrast“ mit Lucide **`contrast`**. Der lokale `ui/lucide-icons.js`-Symbolbestand enthält beide Geometrien; keine fremde Icon-CDN-Abhängigkeit.

**Werte/Bedienung:** Ausgangspunkt und neutraler Wert jeweils **100 %**. Helligkeit: 70–140 % in 5er-Schritten. Kontrast: 60–140 % in 5er-Schritten. Werte werden während der Eingabe live im Menü als Prozentwert angezeigt und an den Kartenadapter gemeldet; bei abgeschlossener Änderung über den bestehenden `save()`-Port im Projekt gespeichert. Die Regler sind außerhalb der Satellitenkarte deaktiviert, behalten jedoch ihre Werte. Das Menü bleibt beim Verschieben offen und ist bei kleinen Viewports intern scrollbar. Es gibt keine unbeabsichtigte Helligkeits-/Kontraständerung einer anderen Kartenart.

**Strenge Modulgrenze:** `ui/basemap-menu.js` kennt nur die Slider- und Anzeigeereignisse. `app.js` verdrahtet diese mit dem bestehenden Projektzustand und dem Kartenadapter. **Nur** `map-adapter-leaflet.js` verwendet den CSS-Filter `brightness(B/100) contrast(K/100)` am tatsächlichen **Satelliten-Basiskachellayer**. Marker, Pin-Beschriftungen, Kartenbuttons, Attribution, Schummerungs-Overlay und sonstige Basiskarten werden nicht auf diesem Weg gefiltert. Der vorhandene Schummerungs-Filter für Nicht-Satellitenkarten bleibt erhalten.

**Optionale kompatible Projektfelder:** `satelliteBrightness` (Default 100), `satelliteContrast` (Default 100). Ein altes Projekt ohne diese Schlüssel erhält beim Laden automatisch neutrale Standardwerte durch die vorhandene `{...defaults(),...saved}`-Hydration. IndexedDB-Datenbank `pin2map-new-v1`, Version `1`, Store `kv`, Schlüssel `appState` bleiben unverändert; **keine Migration und keine Löschung** bestehender Pins oder Kacheln. Neue Werte werden nur im bestehenden Projektobjekt mitgespeichert.

**Technische Abnahme:** v139 [Node/Chromium/HTTPS Live 43084901562](https://github.com/pin2map/pin2map-new-test/actions/runs/43084901562) bestanden, [regulärer Feature-Pages-Deploy 43085021050](https://github.com/pin2map/pin2map-new-test/actions/runs/43085021050) bestanden. Die reale Preview meldet `pin2map-preview-v139`; Live-Browser prüft Slider, lokale Lucide-Symbole, Filter-Isolation und ursprüngliche Basiskarten auf Phone, Tablet und Desktop. Persönliche iPhone-Abnahme wird separat dokumentiert.
