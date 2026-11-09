# pin2map NEW – Icon- und Button-Designsystem: Entwurf C

**Datum:** 2026-11-09 · **Status:** vom Nutzer gewählte Grundrichtung, erste **visuelle Erprobung** (noch keine endgültige Freigabe aller Detailmaße) · **Zweig:** `feature/leaflet-modular-core`.

## Verbindliche Grundrichtung

1. **Icons:** ausschließlich Icons aus [Lucide](https://lucide.dev/icons/) für Funktionssymbole. Keine neuen Emoji-, Unicode- oder gemischten Icon-Sets. Die normalen *geografischen Pin-Marker* sind Datenobjekte und werden bei diesem ersten Button-Designversuch nicht verändert.
2. **Icon-Buttons:** kreisrund (`border-radius:50%`), **weiß gefüllt** (`#fff`) und mit **dünnem grauen Rand** (`1px solid #c2c9d1`).
3. **Icons:** aktuelle Testgröße **21 px**, Strichstärke **2 px**, einheitliche runde Linienenden und Ecken; Symbolfarbe dunkelgrau-blau (`#253a4b`). Bestätigung und Löschen/Abbrechen dürfen zur Orientierung farbige **Symbole** verwenden, während Buttonhintergründe weiß bleiben.
4. **Textbuttons:** statt Kreise mit abgeschnittenem Text werden längliche **Pillen** (`border-radius:999px`) mit demselben Weiß-/Rand-System verwendet. Eine Textaktion muss weiterhin ihren ganzen Text anzeigen.
5. **Größen im Erprobungsstand:** allgemein 42 px, oberer Such-/Werkzeugbereich 33–35 px, Zoom 40–42 px, Ebenensteuerung 44–46 px, kleine Dialog-Schließknöpfe 32 px. Diese Werte sind **Testwerte** und können nach Sichtung auf Mobilgeräten gemeinsam feinjustiert werden.

Zentrale Regeln stehen als `--p2m-button-*` und `--p2m-icon-size` in `styles.css`; die Symbole sind in `ui/lucide-icons.js` anhand ihrer originalen SVG-Geometrien aus dem offiziellen Lucide-Repository definiert. Die zentrale Funktion `mount(element,name)` setzt Icons in dynamisch erstellte Schaltflächen ein, `decorate()` verarbeitet statisch markierte `data-pin-icon`-Elemente.

## Erste Anwendungsbereiche

- Suche, Refresh, Einstellungen, Ebenenwahl, Beschriftungssteuerung
- Leaflet-Zoom: Plus, Minus und Alle Pins anzeigen
- Schließen-Buttons in Panels und Suchergebnissen
- Bestätigen/Abbrechen der Pin-Verschiebung
- Löschsymbol je Ebene
- Plus-Symbol für „Neue Ebene“

Bereits laufende Pin- und Ebenenfunktionen wurden nicht umdefiniert. Die Icons haben weiterhin beschriftete `aria-label`-/`title`-Buttons und sind selbst `aria-hidden`.

## Offline und Lizenz

Die **15** SVG-Symbole aus Lucide sind lokal in der App eingebettet; es erfolgt kein separater Online-Iconabruf. Der PWA-App-Shell-Cache wurde auf `pin2map-new-v29` erhöht und enthält `ui/lucide-icons.js`.

Lucide Icons, ISC License: https://lucide.dev/license (Lucide Contributors). Die Icon-Geometrien wurden aus den offiziellen `lucide-icons/lucide`-SVG-Quelldateien übernommen. Bei Weitergabe die Lizenz-/Copyright-Hinweise beibehalten.

## Teststatus und sichere Veröffentlichung

- Syntax sämtlicher angepasster JavaScript-Module im isolierten Testlauf erfolgreich.
- **3/3 neue Design-Vertragstests** in testkompatibler JS-Ausführung erfolgreich.
- **22/22** lokal eingebundene Skripte im Service-Worker-App-Shell-Cache.
- Erneuter vollständiger Node-/Chromium-/Mobilgeräte-Test und GitHub-Pages-Veröffentlichung **noch zu bestätigen**.
- Neue Gestaltung ausschließlich im Entwicklungszweig und unter der Vorschau-URL `https://pin2map.github.io/pin2map-new-test/preview/`. `main`, die ursprüngliche PWA und beide gesicherten Referenzen bleiben unverändert.

## Nächster Abgleich mit dem Nutzer

Nach erfolgreichem Vorschau-Deployment: Wirkt der kreisrunde weiße Button mit grauer Kontur im Kartenausschnitt stimmig? Danach gemeinsam nur die Details (Durchmesser, Konturstärke, Abstände, Schatten und Größenunterschiede) justieren. Erst nach Freigabe der Optik den neuen Standard endgültig für weitere Komponenten festschreiben.
