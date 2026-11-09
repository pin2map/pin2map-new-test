# CI-Fehlerbehebung: Verschiebeklick nach langem Drücken (2026-11-09)

**Repository:** pin2map/pin2map-new-test · **Zweig:** feature/leaflet-modular-core. Keine Änderung an main oder geschützter Referenz.

## Nachgewiesener GitHub-Actions-Fehler

Der Nutzer hat die vollständige Ausgabe von `node --test tests/*.test.js` bereitgestellt: **38 erfolgreich, 1 fehlgeschlagen**. Ursache: strenger Deep-Equality-Vergleich zwischen `-0` und `0` beim Pan-Offset des Pin-Dialogs, kein Fachlogikfehler. Der Test wurde bereits angepasst (Commit `877fbecc15d4b3fc3c088dcf55a6c78e8d8b982d`). **Ein neuer erfolgreicher CI-Lauf ist noch nicht bestätigt.**

Im Chromium-Lauf erscheint nach langer Kartenberührung ein Pin und anschließend beginnt der Verschiebemodus. Ein sofortiger Klick auf die gewünschte neue Position öffnete jedoch keine Bestätigungsleiste; `#confirmMove` blieb verborgen und deaktiviert. Der Browser meldete zusätzlich einen unbehandelten `Illegal invocation`-Fehler.

## Konkrete Korrektur

`app.js` hatte im Leaflet-Klickhandler diese Reihenfolge:

1. Klickunterdrückung aus dem vorangegangenen langen Drücken prüfen (850 ms)
2. Erst danach den aktiven Verschiebemodus auswerten.

Ein absichtlich schnell geklicktes neues Ziel wurde dadurch ignoriert, obwohl `moveMode` bereits aktiv war.

**Jetzt:** Bei aktivem Verschiebemodus wird zuerst `moveController.previewAt(position)` aufgerufen. Die Unterdrückung bleibt für normale Kartenklicks erhalten. Die bestehenden Gestenintervalle, Pin-Fachoperationen und Preview-Darstellung bleiben unverändert. `tests/browser-smoke.cjs` prüft bewusst die unmittelbare Zielwahl nach Pin-Erstellung.

**PWA:** Shell-Cache auf `pin2map-new-v26` erhöht, 21/21 lokale Skripte weiterhin vorhanden. Statische JS-Syntaxprüfung erfolgreich.

## Was ausdrücklich noch offen ist

Das Browser-Log enthält zusätzlich `Illegal invocation`. Dessen Ursache konnte ohne den ausführlichen Stack nicht nachgewiesen werden. Dafür gibt der Test bereits den vollständigen `[pageerror]`-Stack aus; die Vorschau kennzeichnet außerdem die fehlerhafte Kartenadapter-/UI-Phase. Das bisherige Log reicht nicht, um diesen Fehler sicher einer bestimmten Zeile zuzuordnen.

**Die neue Codeänderung ist noch nicht durch einen erfolgreichen GitHub-Actions-End-to-End-Lauf bestätigt.** Bei einem weiteren Fehlschlag sind die neuen `[pageerror]`-Stackzeilen beziehungsweise die Markierung `Pin move preview failed at ...` maßgeblich. Keine Freigabe oder Merge bis CI und realer Browserlauf grün sind.
