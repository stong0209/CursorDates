# CursorDates

Scan a folder for images and videos, compare EXIF/metadata "date taken" with filesystem Created and Modified times, and print discrepancies. Files without a date taken are listed with DateTaken as "Unknown".

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Run (TypeScript directly)

```bash
npm run dev -- "C:\\path\\to\\folder"
```

## Run (built JS)

```bash
npm start -- "C:\\path\\to\\folder"
```

- If no folder is provided, the current working directory is scanned.
- Works on Windows; uses filesystem `Created` (birthtime) and `Modified` (mtime).
