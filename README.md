# Mujtaba Admin — Desktop App

Aplikacja desktopowa do zarządzania portfolio na Hetzner.

## Wymagania
- Node.js (https://nodejs.org) — wersja 18 lub wyższa

## Instalacja i uruchomienie

```bash
# 1. Wejdź do folderu
cd mujtaba-admin

# 2. Zainstaluj zależności
npm install

# 3. Uruchom aplikację
npm start
```

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
