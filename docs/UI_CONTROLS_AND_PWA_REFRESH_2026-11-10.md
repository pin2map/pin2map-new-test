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

## Historischer Zusatzvertrag v140 – durch Nutzerbeschluss v141 vollständig ersetzt (2026-11-11)

**Nutzerfreigabe v139:** Nutzer bestätigt „alle Tests bestanden“ für die beiden Satelliten-Slider, die Isolation des Bildfilters und deren Speicherung; v139 ist damit auf dem getesteten Gerät angenommen.

**Neue Bedienung:** Rechts neben dem Eintrag **Satellit** steht ein kompaktes, eigenständiges, barrierefrei beschriftetes Zurücksetzen-Symbol (vorhandenes lokales Lucide `refresh-cw`). Der Button ist nur bei aktiver Satellitenkarte und mindestens einem abweichenden Reglerwert aktiv. Beim Anklicken werden **beide** Regler gleichzeitig auf den dokumentierten Standard `100 %` gestellt, die Bilddarstellung sofort geändert und die Werte **einmal** über den vorhandenen Projekt-Save-Port gespeichert. Das Kartenarten-Menü bleibt geöffnet; es wird kein Kartenwechsel ausgelöst und keine Pin- oder Kartendatenmigration durchgeführt. Bei beiden Werten 100 % wird Zurücksetzen deaktiviert.

**Inactive-Anzeige:** Sind andere Kartenarten gewählt, bleiben beide Regler deaktiviert und ihre aktuellen gespeicherten Werte erhalten; die Texte „Helligkeit“ und „Kontrast“, deren Prozentanzeigen und Lucide-Symbole erhalten eine ausgegraute Darstellung. Ausschließlich die Komponente `ui/basemap-menu.js` verwaltet diese Darstellung per `.is-inactive`-Klasse. `styles.css` trägt die lokal begrenzten Farb- und Buttonregeln ohne neue `!important`-Altlasten. `app.js` verbindet den einzigen Reset-Callback mit `mapAdapter.setSatelliteAppearance` und `save()`; der Kartenadapter, Projekt-Schema, Datenbank und PWA-Kacheln bleiben unverändert.

**Gates:** Fokussierte Node-/Chromium- und HTTPS-Live-Vertragsprüfungen sind ergänzt; erfolgreiche CI, Pages-Veröffentlichung und persönliche Geräteabnahme werden erst nach tatsächlichem Nachweis im zentralen Projektstatus vermerkt.

## Zusatzvertrag v141 – nur Satelliten-Helligkeit, Standard 140 % und sichtbarer Reset (2026-11-11)

**Ersetzt v139/v140 in Bezug auf Regleranzahl, Filter und Standard.** Der Nutzer meldete per Screenshot: Reset fehlt in der auf dem Gerät sichtbaren alten v139-Veröffentlichung, Kontrastregler ohne Nutzen. Die noch nicht live abgenommene v140-Zwischenversion wurde nicht übernommen. Der verbindliche aktuelle Dialog enthält **nur Helligkeit** mit Lucide `sun-medium`; `Kontrast` und der dazugehörige Eingaberegler wurden entfernt. Der Satelliten-Slider reicht von **70 bis 180 %** in 5er-Schritten und beginnt bei neuen beziehungsweise bisherigen Projekten ohne gespeicherten Wert mit **140 %**. Bereits bewusst gespeicherte Helligkeitswerte behalten Vorrang; keine stille Datenbereinigung. Ein historisch gespeicherter `satelliteContrast`-Wert wird weder im UI verwendet noch auf die Kacheln angewendet, aber zur Verlustvermeidung nicht aus vorhandenen Projektdaten gelöscht.

**Reset rechts neben Satellit:** Ein ausdrücklich sichtbarer Button mit dem Text **„Standard“** und lokalem Lucide-Symbol `refresh-cw` steht rechts neben `Satellit`. Das Icon gehört einem Kind-`span[data-pin-icon]` und kann deshalb durch die lokale Icon-Dekoration ersetzt werden, ohne den sichtbaren Buttontext zu löschen. Der Reset setzt ausschließlich die Helligkeit auf **140 %**, aktualisiert das Esri-World-Imagery-Basiskachelbild unmittelbar und speichert über den vorhandenen `save()`-Port **einmal**. Der Dialog bleibt geöffnet. Auch wenn der Button am Standardwert deaktiviert ist, bleibt die Aufschrift „Standard“ gut sichtbar; der Button ist korrekt beschriftet und fokussierbar, solange aktiv.

**Inaktive Anzeige:** Bei allen anderen Kartenarten ist nur der Helligkeitsregler deaktiviert; die Schrift, Prozentzahl und das Sonnensymbol werden grau dargestellt. Der Reset ist außerhalb von `Satellit` ebenfalls deaktiviert. Gespeicherte Helligkeit bleibt bei Kartenwechsel erhalten.

**Modulverantwortungen:** `index.html` enthält den einen Regler und die sichtbare Reset-Aktion; `ui/basemap-menu.js` besitzt die DOM-Events und UI-Zustandsklassen; `app.js` ist ausschließlich der Composition Root für `onSatelliteAdjust`, `onSatelliteReset`, Karten-Port und Save-Port; `domain/project-model.js` kennt den optionalen neutralen Vorgabewert 140; `map-adapter-leaflet.js` filtert **nur die Esri-Satellitenkacheln** mit `brightness(value/100)`, ohne einen separaten Kontrastfilter und ohne Auswirkungen auf Pins, Beschriftungen, andere Basiskarten oder Schummerung. Keine IndexedDB-Schemaänderung und keine Kachellöschung. Bestehende CSS-Eigentümer und das `!important`-Budget bleiben unverändert.

**Abnahme:** [CI/Node/Chromium/HTTPS-Live 43114800674](https://github.com/pin2map/pin2map-new-test/actions/runs/43114800674) erfolgreich (268/268 Node-Tests, vollständige Chromium-Regression, unabhängige HTTPS-Datei- und Browserprüfung). [Offizieller Feature-Pages-Deploy 43114888203](https://github.com/pin2map/pin2map-new-test/actions/runs/43114888203) erfolgreich; HTTPS-Assets ausdrücklich `pin2map-preview-v141`, Live-Tests auf Phone, Phone-Tracking-URL, Tablet, Desktop bestanden. Persönliche Geräteabnahme noch offen.
