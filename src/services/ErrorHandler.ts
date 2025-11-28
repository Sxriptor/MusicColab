import { Logger } from '../utils/logger';

export type ErrorType = 
  | 'connection-failed'
  | 'signaling-error'
  | 'capture-error'
  | 'audio-error'
  | 'display-error'
  | 'unknown';

export interface AppError {
  type: ErrorType;
  message: string;
  details?: any;
  timestamp: number;
  recoverable: boolean;
}

export type ErrorEventCallback = (error: AppError) => void;
export type RecoveryCallback = () => Promise<boolean>;

interface RetryState {
  attempts: number;
  lastAttempt: number;
  isRetrying: boolean;
}

export class ErrorHandler {
  private maxRetryAttempts: number = 3;
  private baseRetryDelay: number = 1000;
  private retryStates: Map<string, RetryState> = new Map();
  private errorCallback: ErrorEventCallback | null = null;
  private recoveryCallbacks: Map<ErrorType, RecoveryCallback> = new Map();
  private errorLog: AppError[] = [];
  private maxErrorLogSize: number = 100;

  setErrorCallback(callback: ErrorEventCallback): void {
    this.errorCallback = callback;
  }

  registerRecoveryCallback(errorType: ErrorType, callback: RecoveryCallback): void {
    this.recoveryCallbacks.set(errorType, callback);
  }

  async handleError(type: ErrorType, message: string, details?: any): Promise<boolean> {
    const error: AppError = {
      type,
      message,
      details,
      timestamp: Date.now(),
      recoverable: this.isRecoverable(type),
    };

    this.logError(error);
    this.emitError(error);

    if (error.recoverable) {
      return this.attemptRecovery(type);
    }

    return false;
  }

  private isRecoverable(type: ErrorType): boolean {
    const recoverableTypes: ErrorType[] = [
      'connection-failed',
      'signaling-error',
      'display-error',
    ];
    return recoverableTypes.includes(type);
  }

  private async attemptRecovery(type: ErrorType): Promise<boolean> {
    const key = type;
    let state = this.retryStates.get(key);

    if (!state) {
      state = { attempts: 0, lastAttempt: 0, isRetrying: false };
      this.retryStates.set(key, state);
    }

    if (state.isRetrying) {
      Logger.info(`Recovery already in progress for ${type}`);
      return false;
    }

    if (state.attempts >= this.maxRetryAttempts) {
      Logger.error(`Max retry attempts reached for ${type}`);
      this.notifyMaxRetriesReached(type);
      return false;
    }

    state.isRetrying = true;
    state.attempts++;
    state.lastAttempt = Date.now();
    this.retryStates.set(key, state);

    const delay = this.calculateRetryDelay(state.attempts);
    Logger.info(`Attempting recovery for ${type} (attempt ${state.attempts}/${this.maxRetryAttempts}) in ${delay}ms`);

    await this.delay(delay);

    const recoveryCallback = this.recoveryCallbacks.get(type);
    let success = false;

    if (recoveryCallback) {
      try {
        success = await recoveryCallback();
      } catch (error) {
        Logger.error(`Recovery callback failed for ${type}`, error);
        success = false;
      }
    }

    state.isRetrying = false;

    if (success) {
      Logger.info(`Recovery successful for ${type}`);
      this.resetRetryState(type);
    } else {
      Logger.warn(`Recovery failed for ${type}`);
      // Recursively attempt recovery if not at max attempts
      if (state.attempts < this.maxRetryAttempts) {
        return this.attemptRecovery(type);
      }
    }

    return success;
  }

  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, etc.
    return this.baseRetryDelay * Math.pow(2, attempt - 1);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  resetRetryState(type: ErrorType): void {
    this.retryStates.delete(type);
  }

  resetAllRetryStates(): void {
    this.retryStates.clear();
  }

  private notifyMaxRetriesReached(type: ErrorType): void {
    const error: AppError = {
      type,
      message: `Maximum retry attempts (${this.maxRetryAttempts}) reached for ${type}. Manual intervention required.`,
      timestamp: Date.now(),
      recoverable: false,
    };

    this.emitError(error);
  }

  private logError(error: AppError): void {
    Logger.error(`[${error.type}] ${error.message}`, error.details);
    
    this.errorLog.push(error);
    
    // Keep error log size manageable
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift();
    }
  }

  private emitError(error: AppError): void {
    if (this.errorCallback) {
      this.errorCallback(error);
    }
  }

  getErrorLog(): AppError[] {
    return [...this.errorLog];
  }

  getRecentErrors(count: number = 10): AppError[] {
    return this.errorLog.slice(-count);
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  getRetryState(type: ErrorType): RetryState | undefined {
    return this.retryStates.get(type);
  }

  setMaxRetryAttempts(attempts: number): void {
    this.maxRetryAttempts = attempts;
  }

  setBaseRetryDelay(delay: number): void {
    this.baseRetryDelay = delay;
  }
}
