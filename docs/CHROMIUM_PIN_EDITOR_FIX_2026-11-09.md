# Chromium-Regression: Pin-Editor-Callback und Ebenen-Test (2026-11-09)

**Entwicklungszweig:** `feature/leaflet-modular-core`. `main` und die stabile Referenz bleiben unverändert.

## Aus dem realen Chromium-Log eindeutig identifiziert

Das Nutzerlog zeigt vier identische Browserfehler `TypeError: Illegal invocation`, jeweils in `PinEditorView.render` (`ui/pin-editor.js:26`). Ursache: `app.js` gab das native `requestAnimationFrame` unverpackt als `scheduleFrame` an den Pin-Editor weiter; innerhalb der Instanz rief `this.scheduleFrame(onLayout)` die Browser-API mit dem falschen `this`-Empfänger auf.

**Korrektur:** `app.js` übergibt `scheduleFrame: callback => window.requestAnimationFrame(callback)`. Die Präsentationskomponente und fachlichen Datenoperationen bleiben unverändert.

Das Browserlog zeigt außerdem einen Timeout beim Klicken des Ebenen-Buttons. Die Oberfläche verbirgt diesen Button **absichtlich**, wenn der Pin-Dialog geöffnet ist (CSS `body.pin-open .layers-bottom-button {display:none!important}`). Dies war ein **Testablauffehler**: Der Chromium-Test schließt jetzt zuerst den Pin-Editor, öffnet die Ebenenverwaltung, blendet Privat aus/ein, schließt diese Verwaltung, öffnet den Pin erneut und vergleicht die unveränderten Koordinaten. Kein Produkt-UI-Verhalten wurde dafür verändert.

Im Browser-Test wird die Fehlerliste direkt nach der Pin-Erstellung auf Leerheit geprüft, um diese Regression frühzeitig zu erkennen.

**PWA-Cache:** `pin2map-new-v27`; weiterhin alle 21 lokalen Skripte im Offline-App-Shell-Cache.

## Prüfstatus

Statische Syntaxprüfung von `app.js`, `sw.js`, `tests/browser-smoke.cjs` erfolgreich. Skript-/Cache-Abgleich erfolgreich. **Ein erfolgreicher GitHub-Actions-Chromium-Lauf nach dieser Korrektur ist noch nicht bestätigt.** Vollständiger Node-/Browserlauf und manueller Mobiltest sind vor einer Freigabe weiterhin erforderlich.
