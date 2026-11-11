# Restinventur von `app.js` – nach v112

**Stand:** 2026-11-11 · **Branch:** `feature/leaflet-modular-core` · **Quellstand:** v115 (Fortschreibung der v112-Restinventur)

## Auftrag und Maßstab

Nach zehn Schritten zur Entflechtung von `app.js` wurde dessen Restfunktion entlang der verbindlichen Architekturgrenzen geprüft. Ziel ist **keine möglichst kleine Datei**, sondern ein Composition Root, der Projektzustand und Module verbindet, ohne eigenständige Fach-/UI-Abläufe zu verstecken.

## Bestandsgruppen und Entscheidungen

| Bereich | Aktueller Verbleib | Architekturentscheidung |
| --- | --- | --- |
| Projekt laden, Altwert `activeLayer` verwerfen, private Ebene sicherstellen, Suchcache bereinigen | Seit v114 `application/project-hydration.js` (Laden über Storage-Adapter weiterhin `init()`) | **In v114 umgesetzt und bestätigt:** vollständige/teilweise/ungültige Daten, gespeicherte Pins und fehlende private Ebene, ohne Migration |
| Nominatim-Treffer validieren und als Pin übernehmen; Karte auf Ergebnis zentrieren; einen oder mehrere Treffer unterscheiden | Seit v113 `application/search-pin-transfer.js`, Aufrufports in `app.js` | **In v113 umgesetzt und bestätigt:** 0/1/mehrere Treffer, ungültige Koordinaten, Zoom, Pin- und Viewport-Persistenz ohne Nominatim-Netzwerk |
| Ebenen hinzufügen: Benutzereingabe, Domänenprüfung, Meldungen und Render/Save | Bis v111 inline im `bind()` | **In v112 umgesetzt:** `application/layer-creation.js`; Prompt als injizierter UI-Port, Mutation bleibt `application/layer-operations.js` |
| Pin-Editor-Eingaben, Ebenensichtbarkeit und Einzelpin-Löschung | Rückrufe in `app.js` an bestehende `ui/`-Module | **Anwendungsverdrahtung vorerst beibehalten**; Regeln sind Eigentum von `pin-operations`, `filter-operations` und `layer-operations`. Nur bei wiederholten fachlichen Mustern erneut extrahieren |
| Pin-Marker, Ebenenliste und Pin-Panel rendern | `renderMarkers()`, `renderLayers()`, `renderPinPanel()` | **Composition Root**, injiziert Daten und ruft UI-Views auf; nicht allein wegen Umfang auslagern |
| Karten-Overlay-Layout bei `move`, `moveend`, `zoomend`, Resize | `scheduleMapOverlayUpdate()`, `updatePanelLayout()` u. a. | **Späterer Kandidat**, wenn der Lifecycle als kohärente Overlay-Layout-Aufgabe testbar getrennt werden kann; Leaflet bleibt ausschließlich hinter Karten-Port |
| Karte bei Klick im Verschiebemodus / nach Langdruck | Seit v115 `application/map-click-coordinator.js` und schlanke Verdrahtung in `app.js` | **In v115 umgesetzt und bestätigt:** Move-Ziel vor Unterdrückung durch Langdruck; Normal-Klick schließt Overlays |
| PWA-Refresh, SW-Registrierung, Sichtbarkeitswechsel | `bind()`/`init()` | **Composition Root** für den Aufruf bereits vorhandener PWA-/Persistence-Module; keine neue Fachzuständigkeit |
| Erzeugung der Views/Controller und injizierte Ports | Initialisierung in `app.js` | **Absichtlich in `app.js` belassen**. Reine Instanziierung ist kein Architekturfehler |

## v112 – umgesetzte Ebenenerzeugung

- Neues `application/layer-creation.js`: `create()` fragt über injizierten UI-Port einen Namen ab, übernimmt `nextName` und `create` des vorhandenen Layer-Operations-Moduls, ordnet die bisherigen Fehlertexte zu und veranlasst bei Erfolg genau `render` gefolgt von `save`.
- `app.js` von **15.149 auf 15.003 Zeichen** reduziert. `index.html` und Offline-`CORE` laden das Modul vor `app.js`, Cache **v112**.
- Neuer `tests/layer-creation.test.js`: Erfolg, abgebrochener Prompt, leerer und doppelter Ebenenname, unerwartete Fehler, korrekte Port- und Packaging-Grenzen.
- Echter Chromium-Test: eine Ebene mit Name `Reisen` im bisherigen Prompt anlegen, anschließend `Reisen` in der über den unveränderten IndexedDB-Repository-Port geladenen Ebenenliste nachweisen. Bestehende Browserfälle für private Pins, Basiskarten, Move, Offline-Neuladen und Löschdialoge bleiben bestanden.
- **CI/Preview-Gates final grün** für `277760ee562f2081b7149ea75330788803c74178`: [Node+Chromium](https://github.com/pin2map/pin2map-new-test/actions/runs/42991543896), [Architektur](https://github.com/pin2map/pin2map-new-test/actions/runs/42991543940), [Pages/HTTPS mit Live-Start](https://github.com/pin2map/pin2map-new-test/actions/runs/42991543920). Preview-Workflow: **188 Node-Tests bestanden, 0 Fehler**, korrekte SW-Version/Assets und Live-Start auf Phone/Tablet/Desktop bestätigt.

## Schutz und nächster Schritt

Weder `main`, `reference/*`, CSS (298 `!important`), Topo-Quelle `a.tile.opentopomap.org` noch IndexedDB-Schema oder Nutzerdaten wurden verändert. Der Browser-Test wurde mit isolierter Testdatenbank ausgeführt. **Kein persönlicher Gerätetest für v112 erforderlich.**

**Nächste Aufgabe:** `choosePlace()`/`renderResults()` fachlich und hinsichtlich der Sichtbarkeit am Karten-Port prüfen, dann eine zusammenhängende Suchtreffer-Übernahme extrahieren, mit Tests für ungültige Koordinaten, 0/1/mehrere Treffer und gespeicherte Pins. Keine externen Nominatim-Abfragen in CI.

## v113 – Suchtreffer-Übernahme abgeschlossen

- `application/search-pin-transfer.js` ist Eigentümer des 0/1/Mehrfach-Treffer-Workflows, der Datenvalidierung, der Übergabe an Pin-Erzeugung und des Karten-Port-Zentrierens. `app.js` bleibt Composition Root. `application/place-search-service.js`, Such-Ergebnisview, Leaflet-Adapter und IndexedDB-Schema wurden nicht geändert.
- Browser-Smoke testet offline den bereits vorhandenen Suchcache (ohne Nominatim), Auswahl aus mehreren Treffern, automatische Einzeltreffer-Übernahme, zwei gespeicherte Pins und zentrierten Viewport nach Reload.
- Bestätigte Gates: <https://github.com/pin2map/pin2map-new-test/actions/runs/42992796747>, <https://github.com/pin2map/pin2map-new-test/actions/runs/42992796879>, <https://github.com/pin2map/pin2map-new-test/actions/runs/42992796882>. Nächster Kandidat: Hydrierung des gespeicherten Projekts mit besonderem Schutz vor Migration/Änderung der bisherigen Datenstruktur.

## v114 – Projekthydrierung abgeschlossen

- `application/project-hydration.js` erhält exakt die ursprünglichen Startregeln (gespeicherte Pins und Ebenen nur bei zwei Arrays akzeptieren; private Ebene bei Fehlen per `unshift` ergänzen; historisches `activeLayer` im Arbeitszustand entfernen; Search-Cache bereinigen). `app.js` behält die Datenbank-/Ladeport-Verdrahtung.
- Neue Unit-Tests und echter Chromium-Regressionstest sichern gültige, ungültige sowie unvollständige Datensätze, Schutz der Pins, private Ebene und persistierte Altwertbereinigung. Kein Schemawechsel, keine Migration.
- Grüne Gates: <https://github.com/pin2map/pin2map-new-test/actions/runs/42994178691>, <https://github.com/pin2map/pin2map-new-test/actions/runs/42994178638>, <https://github.com/pin2map/pin2map-new-test/actions/runs/42994178685>. Nächste Prüfung: Map-Klick-/Move- und Overlay-Lebenszyklus, nur bei sicherer Modulgrenze extrahieren.

## v115 – Kartenklick-Koordination abgeschlossen

- `application/map-click-coordinator.js` entscheidet ohne Leaflet/DOM/IndexedDB über akzeptiertes Verschiebeziel versus Langdruck-Unterdrückung und gewöhnliches Schließen. Move-/Gesten-/Marker-Verträge verbleiben in bestehenden Modulen.
- Neue Unit-Tests prüfen die Reihenfolge aller vier Fälle. Chromium-Smoke und Preview-Live-Start unverändert erfolgreich. Gates: <https://github.com/pin2map/pin2map-new-test/actions/runs/42995116808>, <https://github.com/pin2map/pin2map-new-test/actions/runs/42995117164>, <https://github.com/pin2map/pin2map-new-test/actions/runs/42995116869>.
- Nächste Bewertung: Kartenbewegungs-/Overlay-Layout-Koordination, bei erhöhter Vorsicht wegen Pin-Pan- und Gestengeometrie. Kein unnötiges Aufbrechen bereits stabiler Module.
