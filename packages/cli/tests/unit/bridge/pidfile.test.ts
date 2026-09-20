import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('os', () => ({
  homedir: () => '/fake/home',
}));

const fsMock = {
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
};

vi.mock('fs', () => fsMock);

const { ensureSpecsHome, readPid, writePid, clearPidFile, isAlive, getRunningPid, BRIDGE_PID_FILE, BRIDGE_LOG_FILE } =
  await import('../../../src/bridge/pidfile.js');

describe('pidfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes paths under the (mocked) home directory, not a hardcoded location', () => {
    expect(BRIDGE_PID_FILE).toBe('/fake/home/.specs/bridge.pid');
    expect(BRIDGE_LOG_FILE).toBe('/fake/home/.specs/bridge.log');
  });

  describe('ensureSpecsHome', () => {
    it('creates the directory when it does not exist', () => {
      fsMock.existsSync.mockReturnValue(false);
      ensureSpecsHome();
      expect(fsMock.mkdirSync).toHaveBeenCalledWith('/fake/home/.specs', { recursive: true });
    });

    it('does not create the directory when it already exists', () => {
      fsMock.existsSync.mockReturnValue(true);
      ensureSpecsHome();
      expect(fsMock.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('readPid', () => {
    it('returns null when the pidfile does not exist', () => {
      fsMock.existsSync.mockReturnValue(false);
      expect(readPid()).toBeNull();
    });

    it('returns the parsed pid when the file contains a valid integer', () => {
      fsMock.existsSync.mockReturnValue(true);
      fsMock.readFileSync.mockReturnValue('12345\n');
      expect(readPid()).toBe(12345);
    });

    it('returns null when the file contents are not a valid positive integer', () => {
      fsMock.existsSync.mockReturnValue(true);
      fsMock.readFileSync.mockReturnValue('not-a-pid');
      expect(readPid()).toBeNull();
    });

    it('returns null for a negative or zero pid', () => {
      fsMock.existsSync.mockReturnValue(true);
      fsMock.readFileSync.mockReturnValue('-5');
      expect(readPid()).toBeNull();
    });
  });

  describe('writePid / clearPidFile', () => {
    it('writePid ensures the directory exists and writes the pid as a string', () => {
      fsMock.existsSync.mockReturnValue(false);
      writePid(999);
      expect(fsMock.mkdirSync).toHaveBeenCalled();
      expect(fsMock.writeFileSync).toHaveBeenCalledWith('/fake/home/.specs/bridge.pid', '999', 'utf8');
    });

    it('clearPidFile removes the file when it exists', () => {
      fsMock.existsSync.mockReturnValue(true);
      clearPidFile();
      expect(fsMock.unlinkSync).toHaveBeenCalledWith('/fake/home/.specs/bridge.pid');
    });

    it('clearPidFile is a no-op when the file does not exist', () => {
      fsMock.existsSync.mockReturnValue(false);
      clearPidFile();
      expect(fsMock.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('isAlive', () => {
    it('returns true when process.kill(pid, 0) does not throw', () => {
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true as never);
      expect(isAlive(123)).toBe(true);
      killSpy.mockRestore();
    });

    it('returns false when process.kill(pid, 0) throws (process not running)', () => {
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => { throw new Error('ESRCH'); });
      expect(isAlive(123)).toBe(false);
      killSpy.mockRestore();
    });
  });

  describe('getRunningPid', () => {
    it('returns null when there is no pidfile', () => {
      fsMock.existsSync.mockReturnValue(false);
      expect(getRunningPid()).toBeNull();
    });

    it('returns the pid when the pidfile exists and the process is alive', () => {
      fsMock.existsSync.mockReturnValue(true);
      fsMock.readFileSync.mockReturnValue('456');
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true as never);

      expect(getRunningPid()).toBe(456);

      killSpy.mockRestore();
    });

    it('cleans up a stale pidfile and returns null when the recorded pid is not alive', () => {
      fsMock.existsSync.mockReturnValue(true);
      fsMock.readFileSync.mockReturnValue('456');
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => { throw new Error('ESRCH'); });

      expect(getRunningPid()).toBeNull();
      expect(fsMock.unlinkSync).toHaveBeenCalledWith('/fake/home/.specs/bridge.pid');

      killSpy.mockRestore();
    });
  });
});
