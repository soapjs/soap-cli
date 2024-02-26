export default class Logger {
    static logger: Logger;
    private minLevel: number;

    private readonly levels: { [key: string]: number } = {
        'trace': 1,
        'debug': 2,
        'info': 3,
        'warn': 4,
        'error': 5
    };

    private constructor(options: LogOptions) {
        this.minLevel = this.levelToInt(options.minLevel);
    }

    public static getLogger(options?: LogOptions): Logger {
        if (!Logger.logger) {
            let opts: LogOptions = {
                // defaults
                minLevel: LogLevel.Info,
                ...options,
            };

            Logger.logger = new Logger(opts);
        }

        return Logger.logger;
    }

    public trace(message: string, icon?: string): void {
        this.log({ level: LogLevel.Trace, message, icon, });
    }
    public debug(message: string, icon?: string): void {
        this.log({ level: LogLevel.Debug, message, icon, });
    }
    public info(message: string, icon?: string): void {
        this.log({ level: LogLevel.Info, message, icon, });
    }
    public warn(message: string, icon?: string): void {
        this.log({ level: LogLevel.Warn, message, icon, });
    }
    public error(message: string, icon?: string): void {
        this.log({ level: LogLevel.Error, message, icon, });
    }

    private log(data: LogEntry) {
        const level = this.levelToInt(data.level);

        if (level < this.minLevel) return;

        const text = this.buildText(data);

        switch (data.level) {
            case 'trace':
                console.trace(text);
                break;
            case 'debug':
                console.debug(text);
                break;
            case 'info':
                console.info(text);
                break;
            case 'warn':
                console.warn(text);
                break;
            case 'error':
                console.error(text);
                break;
            default:
                console.log(`{${data.level}} ${text}`);
        }
    }

    private buildText(data: LogEntry): string {
        let text = '';

        const { message, icon } = data;

        if (icon) { text += `${icon} `; }
        text += `${message}`;

        return text;
    }

    /**
     * Converts a string level (trace/debug/info/warn/error) into a number 
     * 
     * @param minLevel 
     */
    private levelToInt(minLevel: string): number {
        if (minLevel.toLowerCase() in this.levels)
            return this.levels[minLevel.toLowerCase()];
        else
            return 99;
    }


};

export interface LogOptions {
    minLevel?: LogLevel;
}

export interface LogEntry {
    level: LogLevel;
    message: string;
    module?: string;
    icon?: string;
}

export enum LogLevel {
    Trace = 'trace',
    Debug = 'debug',
    Info = 'info',
    Warn = 'warn',
    Error = 'error'
};
