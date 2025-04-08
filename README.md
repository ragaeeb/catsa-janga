# catsa-janga

[![wakatime](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/39d4c21f-6f74-48e2-a1ae-54db38ee526e.svg)](https://wakatime.com/badge/user/a0b906ce-b8e7-4463-8bce-383238df6d4b/project/39d4c21f-6f74-48e2-a1ae-54db38ee526e)
[![Node.js CI](https://github.com/ragaeeb/catsa-janga/actions/workflows/build.yml/badge.svg)](https://github.com/ragaeeb/catsa-janga/actions/workflows/build.yml)
![GitHub License](https://img.shields.io/github/license/ragaeeb/catsa-janga)
![GitHub Release](https://img.shields.io/github/v/release/ragaeeb/catsa-janga)
[![codecov](https://codecov.io/gh/ragaeeb/catsa-janga/graph/badge.svg?token=PK55V1R324)](https://codecov.io/gh/ragaeeb/catsa-janga)
![0 Dependencies](https://img.shields.io/badge/dependencies-0-green)
[![Size](https://deno.bundlejs.com/badge?q=catsa-janga@latest)](https://bundlejs.com/?q=catsa-janga%40latest)
![typescript](https://badgen.net/badge/icon/typescript?icon=typescript&label&color=blue)
![Types](https://img.shields.io/npm/types/catsa-janga)
![npm](https://img.shields.io/npm/v/catsa-janga)
![npm](https://img.shields.io/npm/dm/catsa-janga)
![GitHub issues](https://img.shields.io/github/issues/ragaeeb/catsa-janga)
![GitHub stars](https://img.shields.io/github/stars/ragaeeb/catsa-janga?style=social)
![Node & Bun](https://img.shields.io/badge/Works%20with-Node%20%26%20Bun-green)
![Maintenance](https://img.shields.io/maintenance/yes/2025)

A utility library for automatically saving and restoring progress in long-running Bun applications.

## Features

- 💾 Automatically saves progress data to a file
- 🔄 Restores progress data when restarting a process
- 🛑 Handles process termination signals (SIGINT, SIGTERM)
- ⚠️ Captures unhandled exceptions and promise rejections
- 🔍 Lightweight with no external dependencies
- 📝 TypeScript support

## Installation

```bash
# Using Bun
bun add catsa-janga

# Using npm
npm install catsa-janga
```

## Usage

### Basic Example

The recommended way to use CatsaJanga is:

```typescript
import { CatsaJanga } from 'catsa-janga';

// Define your data structure
type MyData = {
    items: string[];
    processedCount: number;
    timestamp: Date;
};

// Create initial data
const data: MyData = {
    items: [],
    processedCount: 0,
    timestamp: new Date(),
};

// Create a progress saver
const saver = new CatsaJanga<MyData>({
    getData: () => ({
        ...data,
        timestamp: new Date(), // Update timestamp on save
    }),
    logger: console, // Use console as logger
    outputFile: 'progress.json',
});

Object.assign(data, await saver.restore());

// Your long-running process
async function processItems() {
    for (let i = 0; i < 1000; i++) {
        // Simulate work
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Update data
        data.items.push(`Item ${i}`);
        data.processedCount++;

        // Optionally save progress periodically
        if (i % 100 === 0) {
            await saver.saveProgress();
        }
    }

    // Save final progress
    await saver.saveProgress();
}

// Start processing
await processItems();
```

## Real-world example

Here's how you might use it in a scraping or OCR application:

```typescript
import { CatsaJanga } from 'catsa-janga';

// Define your data structure
type OCRResult = {
    pages: Array<{ page: number; text: string }>;
    timestamp: Date;
};

// Create initial data
const initialData: OCRResult = {
    pages: [],
    timestamp: new Date(),
};

// Create and restore in one step
const saver = new CatsaJanga<OCRResult>({
    getData: () => ({
        ...data,
        pages: data.pages.toSorted((a, b) => a.page - b.page),
        timestamp: new Date(),
    }),
    logger: console,
    outputFile: 'ocr-progress.json',
});

Object.assign(data, await saver.restore());

// Process pages (if we crash, we'll resume where we left off)
for (const file of files) {
    if (data.pages.some((p) => p.page === file.pageNumber)) {
        console.log(`Skipping already processed page ${file.pageNumber}`);
        continue;
    }

    const result = await processOCR(file);
    data.pages.push({ page: file.pageNumber, text: result });

    // Save periodically
    if (data.pages.length % 10 === 0) {
        await saver.saveProgress();
    }
}

// Final save
await saver.saveProgress();
```

## API

### CatsaJanga

The main class for saving and restoring progress.

#### Constructor

```typescript
constructor(options: CatsaJangaOptions<T>)
```

**Options:**

- `getData`: Function that returns the current data to save
- `logger`: Logger object with at least `info` and `error` methods (compatible with console, Pino, etc.)
- `outputFile`: File path where progress will be saved
- `initialData` (optional): Initial data to use if no saved data exists

#### Methods

##### restore

```typescript
async restore(): Promise<T | undefined>
```

Checks for an existing progress file and restores data if present. Returns the restored data, the initialData (if provided and no saved data exists), or `undefined`.

##### saveProgress

```typescript
async saveProgress(): Promise<void>
```

Saves the current progress to the output file.

### Interfaces

#### Logger

```typescript
interface Logger {
    error: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn?: (message: string, ...args: any[]) => void;
}
```

Compatible with `console`, Pino loggers, and other similar logging libraries.

#### CatsaJangaOptions

```typescript
interface CatsaJangaOptions<T> {
    getData: () => T;
    logger: Logger;
    outputFile: string;
    initialData?: T;
}
```

## Error Handling

catsa-janga automatically registers handlers for:

- `SIGINT` (Ctrl+C)
- `SIGTERM` (process termination)
- `uncaughtException` (unhandled errors)
- `unhandledRejection` (unhandled promise rejections)

When any of these events occur, the progress will be saved before the process exits.

## License

MIT
