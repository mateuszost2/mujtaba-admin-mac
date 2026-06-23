# Mujtaba Admin — Desktop App

Aplikacja desktopowa do zarządzania portfolio na Hetzner.

## Wymagania
- Node.js (https://nodejs.org) — wersja 16.20.2 lub wyższa (przetestowano z 24.16.0 — nie trzeba instalować najnowszej wersji)

## Instalacja i uruchomienie

1. Zainstaluj Node.js (jednorazowo): [nodejs.org](https://nodejs.org) — wersja LTS, kliknij przez instalator.
2. Otwórz Terminal (Mac: Cmd+Space → "Terminal").
3. Przeciągnij folder z projektem (ten folder, np. z Desktopu) na okno Terminala — wpisze się ścieżka. Naciśnij Enter, żeby wejść do folderu.
4. Zainstaluj zależności (tylko raz, trwa chwilę):
   ```bash
   npm install
   ```
5. Uruchom aplikację:
   ```bash
   npm start
   ```

Przy kolejnych uruchomieniach wystarczą kroki 2–3 i `npm start` (bez `npm install`).

Jeśli `npm install` zgłosi błąd związany z kompilacją (Xcode/command line tools), uruchom najpierw `xcode-select --install`, a potem ponów `npm install`.

## Budowanie .exe (instalator Windows)

```bash
npm run build
```

Plik instalatora pojawi się w folderze `dist/`.

## macOS: "Aplikacja jest uszkodzona"

Aplikacja nie jest podpisana certyfikatem Apple Developer (wymaga płatnego konta, $99/rok), więc Gatekeeper blokuje ją po pobraniu z internetu i pokazuje błąd "is damaged and can't be opened". To nie jest prawdziwe uszkodzenie — wystarczy usunąć flagę kwarantanny.

Po zamontowaniu .dmg i przeniesieniu aplikacji do `/Applications`, otwórz Terminal i wpisz:

```bash
xattr -cr "/Applications/Mujtaba Admin.app"
```

Następnie otwórz aplikację normalnie (dwuklik). Jeśli nadal pojawi się ostrzeżenie o "nieznanym developerze", kliknij prawym przyciskiem na aplikację → **Open** → potwierdź **Open** w oknie dialogowym.

## Połączenie z serwerem

Przy pierwszym uruchomieniu podaj:
- **Host**: mujtabamanzoor.com
- **Username**: server
- **Password**: hasło do serwera LUB wskaż plik klucza SSH
- **Remote path**: /home/server/mujtaba-website

Dane (bez hasła) są zapamiętywane na kolejne uruchomienia.

## Uwagi
- Po uploadzie plik pojawi się na stronie po ~5 minutach (cron regeneruje manifest)
- Metadane (tytuł, rok, rola) są zapisywane natychmiast
