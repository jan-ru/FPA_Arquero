import { ApplicationError, ErrorContext } from './ApplicationError.ts';
import { ErrorCodes } from './ErrorCodes.ts';

/**
 * Context for configuration errors
 */
export interface ConfigurationContext extends ErrorContext {
    /** Configuration file name */
    configFile?: string;
    
    /** Configuration property name */
    property?: string;
    
    /** Expected value or type */
    expected?: string;
    
    /** Actual value found */
    actual?: unknown;
}

/**
 * Base class for configuration errors
 * 
 * Used for errors related to application configuration, including missing
 * config files, invalid config values, and configuration loading failures.
 * 
 * @example
 * throw new ConfigurationError('Invalid configuration', {
 *   configFile: 'config.json',
 *   property: 'statements.defaultType'
 * });
 */
export class ConfigurationError extends ApplicationError {
    constructor(
        message: string,
        context: ConfigurationContext = {},
        cause?: Error
    ) {
        const userMessage = 'Configuration error. Please check the application settings.';
        
        super(message, {
            code: ErrorCodes.CFG_INVALID,
            userMessage,
            context,
            cause,
            logLevel: 'error',
        });
    }
}

/**
 * Error thrown when configuration file is missing
 * 
 * @example
 * throw new MissingConfigError('config.json');
 */
export class MissingConfigError extends ConfigurationError {
    readonly configFile: string;
    
    constructor(configFile: string, cause?: Error) {
        const message = `Configuration file not found: ${configFile}`;
        const userMessage = `Configuration file "${configFile}" is missing. The application may not work correctly.`;
        
        super(message, { configFile }, cause);
        
        this.configFile = configFile;
        
        // Override code and user message
        (this as any).code = ErrorCodes.CFG_MISSING;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when configuration is invalid
 * 
 * @example
 * throw new InvalidConfigError('config.json', 'statements.defaultType', 'invalid-type');
 */
export class InvalidConfigError extends ConfigurationError {
    readonly property: string;
    readonly value: unknown;
    
    constructor(configFile: string, property: string, value: unknown, reason?: string) {
        const message = `Invalid configuration in ${configFile}: ${property} = ${JSON.stringify(value)}${reason ? ` (${reason})` : ''}`;
        const userMessage = `Configuration error: ${property} has an invalid value${reason ? `: ${reason}` : ''}.`;
        
        super(message, { configFile, property, actual: value }, undefined);
        
        this.property = property;
        this.value = value;
        
        // Override code and user message
        (this as any).code = ErrorCodes.CFG_INVALID_VALUE;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when configuration loading fails
 * 
 * @example
 * try {
 *   const config = await loadConfig();
 * } catch (error) {
 *   throw new ConfigLoadError('config.json', error);
 * }
 */
export class ConfigLoadError extends ConfigurationError {
    readonly configFile: string;
    
    constructor(configFile: string, cause: Error) {
        const message = `Failed to load configuration: ${configFile}`;
        const userMessage = `Unable to load configuration file "${configFile}". The application may not work correctly.`;
        
        super(message, { configFile }, cause);
        
        this.configFile = configFile;
        
        // Override code and user message
        (this as any).code = ErrorCodes.CFG_LOAD_FAILED;
        (this as any).userMessage = userMessage;
    }
}

/**
 * Error thrown when a required configuration property is missing
 * 
 * @example
 * throw new MissingConfigPropertyError('config.json', 'apiUrl', 'database');
 */
export class MissingConfigPropertyError extends ConfigurationError {
    readonly configFile: string;
    readonly property: string;
    readonly section?: string;
    
    constructor(configFile: string, property: string, section?: string) {
        const sectionText = section ? ` in section "${section}"` : '';
        const message = `Missing required property "${property}"${sectionText} in ${configFile}`;
        const userMessage = `Configuration error: The required property "${property}"${sectionText} is missing from ${configFile}.`;
        
        super(message, { configFile, property, section });
        
        this.configFile = configFile;
        this.property = property;
        this.section = section;
        
        // Override code and user message
        (this as any).code = ErrorCodes.CFG_MISSING_PROPERTY;
        (this as any).userMessage = userMessage;
    }
}

export default ConfigurationError;
