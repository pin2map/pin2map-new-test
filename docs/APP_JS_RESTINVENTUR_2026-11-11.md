# Restinventur von `app.js` – nach v112

**Stand:** 2026-11-11 · **Branch:** `feature/leaflet-modular-core` · **Quellstand:** v112

## Auftrag und Maßstab

Nach zehn Schritten zur Entflechtung von `app.js` wurde dessen Restfunktion entlang der verbindlichen Architekturgrenzen geprüft. Ziel ist **keine möglichst kleine Datei**, sondern ein Composition Root, der Projektzustand und Module verbindet, ohne eigenständige Fach-/UI-Abläufe zu verstecken.

## Bestandsgruppen und Entscheidungen

| Bereich | Aktueller Verbleib | Architekturentscheidung |
| --- | --- | --- |
| Projekt laden, Altwert `activeLayer` verwerfen, private Ebene sicherstellen, Suchcache bereinigen | `init()` in `app.js` | **Kandidat: Projekt-Hydrierung** als eigener Anwendungsfall, erst mit Tests für fehlerhaftes/teilweise vorhandenes gespeichertes Projekt |
| Nominatim-Treffer validieren und als Pin übernehmen; Karte auf Ergebnis zentrieren; einen oder mehrere Treffer unterscheiden | `choosePlace()`, `renderResults()` | **Nächster bevorzugter Schnitt:** Suche-zu-Pin-Übernahme mit Karten-Port. Erfordert Tests für ungültige Treffer, Einzeltreffer und Mehrfachtreffer ohne externe Nominatim-Anfragen |
| Ebenen hinzufügen: Benutzereingabe, Domänenprüfung, Meldungen und Render/Save | Bis v111 inline im `bind()` | **In v112 umgesetzt:** `application/layer-creation.js`; Prompt als injizierter UI-Port, Mutation bleibt `application/layer-operations.js` |
| Pin-Editor-Eingaben, Ebenensichtbarkeit und Einzelpin-Löschung | Rückrufe in `app.js` an bestehende `ui/`-Module | **Anwendungsverdrahtung vorerst beibehalten**; Regeln sind Eigentum von `pin-operations`, `filter-operations` und `layer-operations`. Nur bei wiederholten fachlichen Mustern erneut extrahieren |
| Pin-Marker, Ebenenliste und Pin-Panel rendern | `renderMarkers()`, `renderLayers()`, `renderPinPanel()` | **Composition Root**, injiziert Daten und ruft UI-Views auf; nicht allein wegen Umfang auslagern |
| Karten-Overlay-Layout bei `move`, `moveend`, `zoomend`, Resize | `scheduleMapOverlayUpdate()`, `updatePanelLayout()` u. a. | **Späterer Kandidat**, wenn der Lifecycle als kohärente Overlay-Layout-Aufgabe testbar getrennt werden kann; Leaflet bleibt ausschließlich hinter Karten-Port |
| Karte bei Klick im Verschiebemodus / nach Langdruck | `mapAdapter.onMapClick`-Callback | **Späterer Kandidat** für Map-Interaction-Koordination, nur unter Schutz der zuletzt behobenen Long-Press-/Move-Regressionen |
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
