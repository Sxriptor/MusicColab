import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import { Logger } from '../utils/logger';

export type ServerStatus = 'running' | 'stopped' | 'starting' | 'error';
export type ServerEventCallback = (event: 'status-changed' | 'error', data?: any) => void;

export class SignalingServerManager {
  private serverProcess: ChildProcess | null = null;
  private status: ServerStatus = 'stopped';
  private port: number = 8765;
  private eventCallback: ServerEventCallback | null = null;
  private localIp: string = '';

  constructor(port: number = 8765) {
    this.port = port;
    this.localIp = this.getLocalIpAddress();
  }

  setEventCallback(callback: ServerEventCallback): void {
    this.eventCallback = callback;
  }

  private emitEvent(event: 'status-changed' | 'error', data?: any): void {
    if (this.eventCallback) {
      this.eventCallback(event, data);
    }
  }

  private setStatus(status: ServerStatus): void {
    this.status = status;
    this.emitEvent('status-changed', status);
  }

  /**
   * Get the local IP address of this machine
   */
  private getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      const iface = interfaces[name];
      if (!iface) continue;
      
      for (const info of iface) {
        // Skip internal and non-IPv4 addresses
        if (info.internal || info.family !== 'IPv4') continue;
        return info.address;
      }
    }
    return '127.0.0.1';
  }

  /**
   * Start the Python signaling server
   */
  async start(): Promise<boolean> {
    if (this.status === 'running') {
      Logger.warn('Signaling server is already running');
      return true;
    }

    this.setStatus('starting');
    Logger.info(`Starting signaling server on port ${this.port}`);

    try {
      // Determine the path to the Python server script
      const serverScriptPath = this.getServerScriptPath();
      
      // Try to find Python executable
      const pythonCmd = await this.findPythonExecutable();
      if (!pythonCmd) {
        this.setStatus('error');
        this.emitEvent('error', 'Python not found. Please install Python 3.8 or higher.');
        return false;
      }

      // Spawn the Python server process
      this.serverProcess = spawn(pythonCmd, [
        serverScriptPath,
        '--port', this.port.toString(),
        '--host', '0.0.0.0'
      ], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });


      this.serverProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        Logger.info(`[SignalingServer] ${output}`);
        
        // Check if server started successfully
        if (output.includes('Signaling server running') || output.includes('running on')) {
          this.setStatus('running');
        }
      });

      this.serverProcess.stderr?.on('data', (data) => {
        const output = data.toString();
        Logger.error(`[SignalingServer] ${output}`);
      });

      this.serverProcess.on('error', (error) => {
        Logger.error('Failed to start signaling server', error);
        this.setStatus('error');
        this.emitEvent('error', `Failed to start server: ${error.message}`);
      });

      this.serverProcess.on('exit', (code, signal) => {
        Logger.info(`Signaling server exited with code ${code}, signal ${signal}`);
        this.serverProcess = null;
        if (this.status !== 'stopped') {
          this.setStatus('stopped');
        }
      });

      // Wait a bit for the server to start
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (this.status === 'starting') {
        // Assume it started if no error occurred
        this.setStatus('running');
      }

      return this.getStatus() === 'running';
    } catch (error) {
      Logger.error('Error starting signaling server', error);
      this.setStatus('error');
      this.emitEvent('error', `Error starting server: ${error}`);
      return false;
    }
  }

  /**
   * Stop the Python signaling server
   */
  async stop(): Promise<void> {
    if (!this.serverProcess) {
      this.setStatus('stopped');
      return;
    }

    Logger.info('Stopping signaling server');
    
    try {
      // Send SIGTERM to gracefully stop the server
      this.serverProcess.kill('SIGTERM');
      
      // Wait for process to exit
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // Force kill if it doesn't stop gracefully
          if (this.serverProcess) {
            this.serverProcess.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        this.serverProcess?.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (error) {
      Logger.error('Error stopping signaling server', error);
    }

    this.serverProcess = null;
    this.setStatus('stopped');
  }

  /**
   * Get the path to the Python server script
   */
  private getServerScriptPath(): string {
    // In development, the server is in the project root
    // In production, it should be bundled with the app
    const devPath = path.join(process.cwd(), 'server', 'signaling_server.py');
    const prodPath = path.join(process.resourcesPath || '', 'server', 'signaling_server.py');
    
    // Check if we're in development or production
    if (process.env.NODE_ENV === 'development' || !process.resourcesPath) {
      return devPath;
    }
    return prodPath;
  }

  /**
   * Find the Python executable
   */
  private async findPythonExecutable(): Promise<string | null> {
    const candidates = process.platform === 'win32' 
      ? ['python', 'python3', 'py']
      : ['python3', 'python'];

    for (const cmd of candidates) {
      try {
        const result = await this.checkPythonVersion(cmd);
        if (result) {
          return cmd;
        }
      } catch {
        // Continue to next candidate
      }
    }
    return null;
  }

  /**
   * Check if a Python command is available and has the right version
   */
  private checkPythonVersion(cmd: string): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(cmd, ['--version'], { stdio: 'pipe' });
      let output = '';
      
      proc.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      proc.stderr?.on('data', (data) => {
        output += data.toString();
      });
      
      proc.on('error', () => resolve(false));
      
      proc.on('exit', (code) => {
        if (code === 0 && output.includes('Python 3')) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  getStatus(): ServerStatus {
    return this.status;
  }

  getPort(): number {
    return this.port;
  }

  getLocalIp(): string {
    return this.localIp;
  }

  getHostInfo(): { ip: string; port: number } {
    return {
      ip: this.localIp,
      port: this.port
    };
  }
}
