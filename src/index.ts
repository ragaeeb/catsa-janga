import { promises as fs } from 'node:fs';
import process from 'node:process';

/**
 * Options for initializing a CatsaJanga
 */
export interface CatsaJangaOptions<T> {
    /** Function that returns the current data to save */
    getData: () => T;
    /** Initial data (optional) */
    initialData?: T;
    /** Logger instance for output */
    logger: Logger;
    /** File path where progress will be saved */
    outputFile: string;
}

/**
 * Interface for loggers that the CatsaJanga can use
 */
export interface Logger {
    error: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn?: (message: string, ...args: any[]) => void;
}

/**
 * Utility class to save and restore progress for long-running processes
 */
export class CatsaJanga<T> {
    private getData: () => T;
    private initialData?: T;
    private logger: Logger;
    private outputFile: string;

    /**
     * Creates a new CatsaJanga instance
     * @param options Configuration options
     */
    constructor(options: CatsaJangaOptions<T>) {
        this.outputFile = options.outputFile;
        this.getData = options.getData;
        this.logger = options.logger;
        this.initialData = options.initialData;

        this.setupProcessHandlers();
    }

    /**
     * Creates a CatsaJanga and immediately restores data if available
     * @param options Configuration options
     * @returns A promise with the CatsaJanga instance and the restored or initial data
     */
    static async createWithRestore<T>(options: CatsaJangaOptions<T>): Promise<{ data: T; saver: CatsaJanga<T> }> {
        const saver = new CatsaJanga<T>(options);
        const restoredData = await saver.restore();
        const data = restoredData !== undefined ? restoredData : (options.initialData as T);
        return { data, saver };
    }

    /**
     * Checks for an existing file and restores data if present
     * @returns The restored data or undefined if no file exists
     */
    async restore(): Promise<T | undefined> {
        try {
            const fileExists = !!(await fs.stat(this.outputFile).catch(() => false));

            if (!fileExists) {
                return this.initialData;
            }

            try {
                const restoredData = JSON.parse(await fs.readFile(this.outputFile, 'utf-8')) as T;
                this.logger.info('Progress data successfully restored');
                return restoredData;
            } catch (error) {
                this.logger.error(`Error restoring progress: ${error}`);
                return this.initialData;
            }
        } catch (error) {
            this.logger.error(`Error checking file existence: ${error}`);
            return this.initialData;
        }
    }

    /**
     * Saves the current progress to the output file
     * @returns A promise that resolves when the data has been saved
     */
    async saveProgress(): Promise<void> {
        try {
            this.logger.info(`Saving progress to ${this.outputFile}...`);
            await fs.writeFile(this.outputFile, JSON.stringify(this.getData(), null, 2));
        } catch (error) {
            this.logger.error(`Error saving progress: ${error}`);
        }
    }

    /**
     * Sets up process event handlers to save progress on termination or errors
     * @private
     */
    private setupProcessHandlers() {
        // Common handler for all exit scenarios
        const handleExit = async (signal: string, exitCode: number) => {
            this.logger.info(`Process ${signal}. Saving progress...`);
            await this.saveProgress();
            process.exit(exitCode);
        };

        // Handle shutdown signals
        process.on('SIGINT', () => handleExit('interrupted (SIGINT)', 0));
        process.on('SIGTERM', () => handleExit('terminated (SIGTERM)', 0));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.logger.error(`Uncaught exception: ${error.message}`);
            handleExit('crashed with uncaught exception', 1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason) => {
            this.logger.error(`Unhandled promise rejection: ${reason}`);
            handleExit('crashed with unhandled rejection', 1);
        });
    }
}
