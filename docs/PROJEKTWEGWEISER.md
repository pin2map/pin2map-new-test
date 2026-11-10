# pin2map NEW – Projektwegweiser, Vorgaben und Umgebungen

**Stand:** 2026-11-10  
**Aktive Entwicklungsquelle:** pin2map/pin2map-new-test, Branch feature/leaflet-modular-core.  
**Zweck:** Auffindbare zentrale Einstiegsseite; keine zweite, widersprüchliche Sammlung von Fachentscheidungen.

## Verbindliche Quellen – Lesereihenfolge

1. **docs/GRUNDENTSCHEIDUNGEN.md** – 142 Basisentscheidungen und spätere verbindliche Umsetzungspräzisierungen; seit 2026-11-10 ausdrücklich das Gate „erst getestet UND veröffentlicht UND live geprüft = fertig“.
2. **docs/MODULARCHITEKTUR.md** – verbindliche Modulgrenzen, Ports, Daten- und Änderungsverträge.
3. **docs/ENTWICKLUNGSFAHRPLAN.md** – Etappen, Architektur-/Qualitätsgates und Reihenfolge.
4. **docs/DEVELOPMENT_PREVIEW_PAGES_2026-11-09.md** – Veröffentlichungsumgebung, stabile/Preview-Trennung, Deployment-Nachweis.
5. **docs/UI_CONTROLS_AND_PWA_REFRESH_2026-11-10.md** – Gestaltung der Kartenbuttons, Refresh und PWA-Updatevertrag.
6. **docs/VORGAENGER_APP_MODUL_AUDIT.md** – Funktionsinventar der Vorgänger-App; Referenz für Verhalten, keine kopierbare Zielarchitektur.
7. **docs/BROWSER_REGRESSION_GATE_2026-11-09.md**, **docs/REGRESSION_CHECKPOINT_2026-11-09.md** – Prüfinfrastruktur und ausdrücklich als historisch datierte Prüfergebnisse.

Die unter 1–6 genannten Dokumente sind maßgeblich für ihren jeweiligen Bereich. Bei scheinbaren Widersprüchen neuere ausdrücklich beschlossene Regeln und deren Geltungsbereich beachten, nie stillschweigend historische Vorgaben erneut aktivieren.

## Weitere nachgewiesene technische Dokumentation (aktiver Branch)

- **Karten- und Offline-Technik:** docs/KARTENMIGRATION.md; docs/PMTILES-OFFLINE-ARCHITEKTUR.md; docs/PMTILES-STUTTGART.md.
- **Modulübernahmen:** docs/LAYER_MODULARIZATION.md; docs/SEARCH_MODULARIZATION_2026-11-09.md; docs/MAP_GESTURE_MODULARIZATION_2026-11-09.md; docs/PIN_MOVE_WORKFLOW_MODULARIZATION_2026-11-09.md; docs/PIN_OVERLAY_MODULARIZATION_2026-11-09.md; docs/PIN_PANEL_POSITIONER_2026-11-09.md.
- **Pin-Dialog und Versuchsprotokolle:** docs/PIN_DIALOG_LAYER_SELECTOR_2026-11-09.md; docs/PIN_RELOCATION_POINTER_GUIDE_2026-11-09.md; docs/PIN_RELOCATE_ICON_ONLY_TRIAL_2026-11-09.md; docs/DESIGN_SYSTEM_CIRCULAR_LUCIDE_TRIAL_2026-11-09.md.
- **Diagnosen und Regressionen:** docs/CHROMIUM_PIN_EDITOR_FIX_2026-11-09.md; docs/CI_MOVE_CLICK_FIX_2026-11-09.md; docs/BROWSER_REGRESSION_GATE_2026-11-09.md; docs/REGRESSION_CHECKPOINT_2026-11-09.md.
- **Grundlagen:** docs/GRUNDENTSCHEIDUNGEN.md auch auf main (älterer Stand); README.md auf dem aktuellen Branch ist in Teilen historisch und nicht alleinige Statusquelle.

Die Liste wurde anhand des GitHub-Branchvergleichs main → feature/leaflet-modular-core und gezielter Dateiabrufe erstellt. **Ein vollständiges rekursives Dateiverzeichnis sämtlicher Repositories konnte mit dem verfügbaren Connector nicht festgestellt werden.** Die Liste beansprucht daher nicht, jede historische Datei zu enthalten.

## Repositories – identifizierte Aufgaben

| Repository | Einordnung | Geltung |
| --- | --- | --- |
| pin2map/pin2map-new-test | Aktuelle NEW-Entwicklung und Testbereitstellung | aktive Quelle: feature/leaflet-modular-core |
| pin2map/pin2map | Vorgänger-App | Funktion/Design als Referenz, nicht als Code-Architektur |
| pin2map/pin2map-2 | Ältere private Planung, Entscheidungen D-001 bis D-345 und Übergaben | historischer Kontext; neuere modulare Strategie D-341 bis D-345 beachten |
| pin2map/pin2map-poc | Öffentlicher UI-PoC | visuelle/gestische Referenz; nicht Codebasis der neuen App |
| pin2map/pin2map-maplibre-preview | Isolierter MapLibre-Versuch | technische Referenz, nicht Hauptentwicklungsumgebung |
| pin2map/testing | Zusätzliches Test-Repository | Zweck und aktuelle Pflege über Repo-Namen hinaus noch nicht vollständig verifiziert |

## NEW-Branches, Wiederherstellung und Webumgebungen

- **Stabile veröffentlichte Test-PWA:** Branch main, https://pin2map.github.io/pin2map-new-test/ . Nicht durch Preview-Änderungen modifizieren.
- **Aktuelle modulare Entwicklungsquelle:** feature/leaflet-modular-core.
- **Entwicklungs-Preview:** https://pin2map.github.io/pin2map-new-test/preview/ . Veröffentlichung per .github/workflows/preview-pages.yml; gleicher GitHub-Pages-Ursprung wie main, aber getrennte IndexedDB-/Cache-Namen.
- **Älterer technischer Entwicklungszweig:** feature/maplibre-protomaps.
- **Im NEW-Repository vorhandene Referenzzweige:** reference/leaflet-v18-2026-11-09; reference/modular-core-2026-11-09; reference/maplibre-full-integration-accepted-2026-11-09.
- **Separater MapLibre-Referenzzweig:** pin2map-maplibre-preview/reference/maplibre-integration-v2-accepted-2026-11-09.
- **UI-PoC:** https://pin2map.github.io/pin2map-poc/ (getrenntes Repository).
- **Historische Planungsquellen:** pin2map-2/AGENTS.md, docs/PROJECT_STATE.md, docs/DECISIONS.md, docs/ARCHITECTURE.md, docs/NEW_DEVELOPMENT_STRATEGY.md, docs/REQUIREMENTS.md und docs/POC_HANDOFF.md, soweit vorhanden. Manche ältere Texte verlangen noch eine Ein-Datei-App; D-341–D-345 haben diese Pflicht ausdrücklich abgelöst.

## Arbeits- und Abschlussregel

Für einen Anwendungsauftrag sind **Implementierung, technische Tests, wirklicher Browser-Test, erfolgreicher Deploy und Live-Funktionsprüfung** ein zusammengehörender Auftrag. Erst bei überprüftem Live-Ergebnis „abgeschlossen“ melden. Unbekannter GitHub-Actions-Status oder nicht verifizierte Veröffentlichungs-URL = **offen**, auch wenn Commits vorliegen. Für spezifische iPhone-Behauptungen ist ein entsprechender Gerätetest erforderlich. Fundstelle: docs/GRUNDENTSCHEIDUNGEN.md, Entscheidung vom 2026-11-10.

## Offene Hygieneaufgaben

1. Ältere README- und Übergabetexte enthalten teils inzwischen überholte Phasenangaben. Nicht als aktuelle Wahrheit behandeln; bei Gelegenheit mit Links auf diesen Wegweiser versehen.
2. Vollständigkeit der Dokumente in den historischen Repositories noch separat rekursiv inventarisieren, falls dafür eine geeignete Tree/List-Schnittstelle vorhanden wird.
3. Browser- und Deploy-Gate für jede konkrete Version nachweisen. Ein GitHub-Commit beweist keinen erfolgreichen laufenden Preview-Deploy.

## Aktuelle Prioritätsentscheidung (2026-11-10)

**Lokale App zuerst:** Die frühe Serveranbindung aus der ursprünglichen Grundentscheidung 3 ist aufgehoben. Vorrang hat die saubere lokale Architektur, zuerst die dauerhafte Bereinigung der CSS-/Layoutregeln, danach die weiteren Modulgrenzen und der weitgehende lokale Funktionsausbau. Server/Synchronisation erst nach **Gate 3**, wie im Entwicklungsfahrplan vorgesehen. Die ergänzte Vorrangentscheidung in docs/GRUNDENTSCHEIDUNGEN.md ist maßgeblich; frühere gegenteilige Aussagen sind historisch.
