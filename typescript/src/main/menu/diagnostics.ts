// Diagnostic and repair operations for menu
import os from 'node:os';
import path from 'node:path';

export async function showRepairDialog(
  dryRun: boolean,
  getMainWindow?: () => Electron.BrowserWindow | null,
  provider: 'claude' | 'codex' = 'claude'
): Promise<void> {
  // retyper:disable-next-line find-exceptions
  try {
    const { repairProjectMetadata } = await import('../maintenance/repair.js');
    const win = getMainWindow ? getMainWindow() : null;

    const baseDir = provider === 'claude'
      ? path.join(os.homedir(), '.claude')
      : path.join(os.homedir(), '.codex');

    const res = await repairProjectMetadata?.(
      path.join(baseDir, 'projects'),
      path.join(baseDir, 'todos'),
      dryRun
    );

    const runType = dryRun ? 'DRY RUN' : 'LIVE RUN';
    const metadataInfo = dryRun
      ? `Would write metadata: ${res?.metadataPlanned || 0}`
      : `Metadata files written: ${res?.metadataWritten || 0} (planned ${res?.metadataPlanned || 0})`;

    const msg = res
      ? `${runType}\nProjects scanned: ${res.projectsScanned}\nTodo sessions scanned: ${res.todosScanned}\n${metadataInfo}\nMatched via sidecar meta: ${res.matchedBySidecar}\nMatched via JSONL filename: ${res.matchedByJsonl}\nUnanchored sessions: ${res.unknownSessions.length}`
      : 'No result';

    // retyper:disable-next-line find-exceptions
    try {
      const { dialog } = await import('electron');
      await dialog.showMessageBox(win!, {
        type: 'info',
        title: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Repair (${dryRun ? 'Dry Run' : 'Live'})`,
        message: `Repair ${provider.charAt(0).toUpperCase() + provider.slice(1)} Metadata`,
        detail: msg
      });
    } catch {} // EXEMPTION: dialog failures are non-critical
  } catch (e) { // EXEMPTION: repair operation failures should be shown to user
    // retyper:disable-next-line find-exceptions
    try {
      const { dialog } = await import('electron');
      await dialog.showMessageBox(getMainWindow?.()!, {
        type: 'error',
        title: 'Repair Failed',
        message: String(e)
      });
    } catch {} // EXEMPTION: dialog failures are non-critical
  }
}

export async function showDiagnosticsDialog(
  getMainWindow?: () => Electron.BrowserWindow | null
): Promise<void> {
  // retyper:disable-next-line find-exceptions
  try {
    const { collectDiagnostics } = await import('../maintenance/repair.js');
    const win = getMainWindow ? getMainWindow() : null;

    const claude = await collectDiagnostics(
      path.join(os.homedir(), '.claude', 'projects'),
      path.join(os.homedir(), '.claude', 'todos')
    );

    const codexDir = path.join(os.homedir(), '.codex');
    let codex: any = null;

    // retyper:disable-next-line find-exceptions
    try {
      const fs = await import('node:fs');
      if (fs.existsSync(codexDir)) {
        codex = await collectDiagnostics(
          path.join(codexDir, 'projects'),
          path.join(codexDir, 'todos')
        );
      }
    } catch {} // EXEMPTION: codex directory might not exist

    const detail = [
      `Claude: ${claude.unknownCount} unknown` + (claude.text ? `\n${claude.text}` : ''),
      codex ? (`\n\nCodex: ${codex.unknownCount} unknown` + (codex.text ? `\n${codex.text}` : '')) : ''
    ].join('');

    // retyper:disable-next-line find-exceptions
    try {
      const { dialog } = await import('electron');
      await dialog.showMessageBox(win!, {
        type: 'info',
        title: 'Diagnostics',
        message: 'Project Diagnostics',
        detail
      });
    } catch {} // EXEMPTION: dialog failures are non-critical
  } catch (e) { // EXEMPTION: diagnostics failures should be shown to user
    // retyper:disable-next-line find-exceptions
    try {
      const { dialog } = await import('electron');
      await dialog.showMessageBox(getMainWindow?.()!, {
        type: 'error',
        title: 'Diagnostics Failed',
        message: String(e)
      });
    } catch {} // EXEMPTION: dialog failures are non-critical
  }
}