// Pidfile management for the daemonized bridge server process.

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const SPECS_HOME = join(homedir(), '.specs');
export const BRIDGE_PID_FILE = join(SPECS_HOME, 'bridge.pid');
export const BRIDGE_LOG_FILE = join(SPECS_HOME, 'bridge.log');

export function ensureSpecsHome(): void {
  if (!existsSync(SPECS_HOME)) mkdirSync(SPECS_HOME, { recursive: true });
}

export function readPid(): number | null {
  if (!existsSync(BRIDGE_PID_FILE)) return null;
  const raw = readFileSync(BRIDGE_PID_FILE, 'utf8').trim();
  const pid = Number(raw);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

export function writePid(pid: number): void {
  ensureSpecsHome();
  writeFileSync(BRIDGE_PID_FILE, String(pid), 'utf8');
}

export function clearPidFile(): void {
  if (existsSync(BRIDGE_PID_FILE)) unlinkSync(BRIDGE_PID_FILE);
}

/** True if a process with this pid is currently alive. */
export function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the pidfile and checks liveness. Cleans up a stale pidfile
 * (recorded pid no longer running) automatically.
 */
export function getRunningPid(): number | null {
  const pid = readPid();
  if (pid === null) return null;
  if (isAlive(pid)) return pid;
  clearPidFile();
  return null;
}
