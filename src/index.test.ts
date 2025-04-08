import { afterAll, afterEach, describe, expect, spyOn, test } from 'bun:test';
import { existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

import { CatsaJanga } from './index';

describe('CatsaJanga', () => {
    // Create a unique temp file path for each test
    const getTempFilePath = () =>
        join(tmpdir(), `catsa-janga-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);

    // Keep track of temp files to clean up
    const tempFiles: string[] = [];

    const mockLogger = {
        error: (...args: any[]) => {},
        info: (...args: any[]) => {},
        warn: (...args: any[]) => {},
    };

    const originalProcessExit = process.exit;
    const originalListeners = {
        SIGINT: process.listeners('SIGINT'),
        SIGTERM: process.listeners('SIGTERM'),
        uncaughtException: process.listeners('uncaughtException'),
        unhandledRejection: process.listeners('unhandledRejection'),
    };

    afterEach(() => {
        for (const file of tempFiles) {
            try {
                if (existsSync(file)) {
                    unlinkSync(file);
                }
            } catch (error) {
                console.error(`Error cleaning up temp file ${file}:`, error);
            }
        }
        tempFiles.length = 0;
    });

    afterAll(() => {
        process.exit = originalProcessExit;

        process.removeAllListeners('SIGINT');
        process.removeAllListeners('SIGTERM');
        process.removeAllListeners('uncaughtException');
        process.removeAllListeners('unhandledRejection');

        for (const [event, listeners] of Object.entries(originalListeners)) {
            for (const listener of listeners) {
                process.on(event as keyof typeof originalListeners, listener);
            }
        }
    });

    test('constructor sets up event handlers', () => {
        const tempFile = getTempFilePath();
        tempFiles.push(tempFile);

        new CatsaJanga({
            getData: () => ({ test: 'data' }),
            logger: mockLogger,
            outputFile: tempFile,
        });

        expect(process.listeners('SIGINT').length).toBeGreaterThan(originalListeners.SIGINT.length);
        expect(process.listeners('SIGTERM').length).toBeGreaterThan(originalListeners.SIGTERM.length);
        expect(process.listeners('uncaughtException').length).toBeGreaterThan(
            originalListeners.uncaughtException.length,
        );
        expect(process.listeners('unhandledRejection').length).toBeGreaterThan(
            originalListeners.unhandledRejection.length,
        );
    });

    test('saveProgress saves data to file', async () => {
        const tempFile = getTempFilePath();
        tempFiles.push(tempFile);

        const testData = { items: [1, 2, 3], value: 'test' };
        const saver = new CatsaJanga({
            getData: () => testData,
            logger: mockLogger,
            outputFile: tempFile,
        });

        await saver.saveProgress();

        expect(existsSync(tempFile)).toBe(true);

        const savedData = await Bun.file(tempFile).json();
        expect(savedData).toEqual(testData);
    });

    test('restore returns initialData when file does not exist', async () => {
        const tempFile = getTempFilePath();
        tempFiles.push(tempFile);

        const initialData: any = { initial: true };
        const saver = new CatsaJanga({
            getData: () => ({ test: 'data' }),
            initialData,
            logger: mockLogger,
            outputFile: tempFile,
        });

        const result = await saver.restore();

        expect(result).toBe(initialData);
    });

    test('restore returns undefined when file does not exist and no initialData', async () => {
        const tempFile = getTempFilePath();
        tempFiles.push(tempFile);

        const saver = new CatsaJanga({
            getData: () => ({ test: 'data' }),
            logger: mockLogger,
            outputFile: tempFile,
        });

        const result = await saver.restore();

        expect(result).toBeUndefined();
    });

    test('restore returns data when file exists', async () => {
        const tempFile = getTempFilePath();
        tempFiles.push(tempFile);

        const testData: any = { test: 'data' };

        await Bun.write(tempFile, JSON.stringify(testData));

        const saver = new CatsaJanga({
            getData: () => ({ sample: 'other' }),
            logger: mockLogger,
            outputFile: tempFile,
        });

        const result = await saver.restore();

        expect(result).toEqual(testData);
    });

    test('restore handles corrupt json files', async () => {
        const tempFile = getTempFilePath();
        tempFiles.push(tempFile);

        await Bun.write(tempFile, '{ this is not valid JSON }');

        const initialData: any = { fallback: true };
        const saver = new CatsaJanga({
            getData: () => ({ test: 'data' }),
            initialData,
            logger: mockLogger,
            outputFile: tempFile,
        });

        const result = await saver.restore();

        expect(result).toBe(initialData);
    });

    test('createWithRestore creates instance and restores data', async () => {
        const tempFile = getTempFilePath();
        tempFiles.push(tempFile);

        const testData: any = { restoredValue: true };

        await Bun.write(tempFile, JSON.stringify(testData));

        const { data, saver } = await CatsaJanga.createWithRestore({
            getData: () => ({ test: 'data' }),
            logger: mockLogger,
            outputFile: tempFile,
        });

        expect(saver).toBeInstanceOf(CatsaJanga);
        expect(data).toEqual(testData);
    });

    test('createWithRestore returns initial data when no file exists', async () => {
        const tempFile = getTempFilePath();
        tempFiles.push(tempFile);

        const initialData: any = { initial: true };
        const { data, saver } = await CatsaJanga.createWithRestore({
            getData: () => ({ test: 'data' }),
            initialData,
            logger: mockLogger,
            outputFile: tempFile,
        });

        expect(saver).toBeInstanceOf(CatsaJanga);
        expect(data).toBe(initialData);
    });

    test('SIGINT handler saves progress and exits', async () => {
        const tempFile = getTempFilePath();
        tempFiles.push(tempFile);

        process.exit = (code) => {
            throw new Error(`Exit with code ${code}`);
        };

        const testData = { items: [1, 2, 3], value: 'test' };
        const saver = new CatsaJanga({
            getData: () => testData,
            logger: mockLogger,
            outputFile: tempFile,
        });

        const saveSpy = spyOn(saver, 'saveProgress');

        const sigintHandlers = [...process.listeners('SIGINT')];

        const ourHandler = sigintHandlers[sigintHandlers.length - 1];

        try {
            const mockSignalEvent: any = {
                preventDefault: () => {},
                stopPropagation: () => {},
                type: 'SIGINT',
            };
            await ourHandler(mockSignalEvent);
        } catch (error: any) {
            expect(error.message).toContain('Exit with code 0');
        }

        expect(saveSpy).toHaveBeenCalledTimes(1);

        await saveSpy.mock.results[0].value; // Wait for the save to complete
        expect(existsSync(tempFile)).toBe(true);
    });
});
