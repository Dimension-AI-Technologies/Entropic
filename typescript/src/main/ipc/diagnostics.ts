import type { IpcMain } from 'electron';
import type { ProviderPort } from '../core/ports';
import { ResultUtils } from '../../utils/Result.js';

type DiagSummary = {
  totalUnknown: number;
  providers: Array<{ id: string; unknownCount: number; ok: boolean; error?: string }>;
  details: Record<string, string>;
};

export function registerDiagnosticsIpc(ipcMain: IpcMain, providers: ProviderPort[]) {
  ipcMain.handle('collect-diagnostics-hex', async (): Promise<DiagSummary> => {
    const results = await Promise.all(providers.map(async (p) => {
      const diagnosticsResult = await ResultUtils.fromPromise(
        p.collectDiagnostics()
      );

      if (diagnosticsResult.success) {
        const r = diagnosticsResult.value;
        if (r.success) {
          return { id: p.id, ok: true, unknownCount: r.value.unknownCount, details: r.value.details } as const;
        }
        return { id: p.id, ok: false, unknownCount: 0, error: String(r.error || 'unknown error'), details: '' } as const;
      } else {
        return { id: p.id, ok: false, unknownCount: 0, error: diagnosticsResult.error || 'exception', details: '' } as const;
      }
    }));
    const totalUnknown = results.reduce((sum, r) => sum + (r.ok ? r.unknownCount : 0), 0);
    const providersOut = results.map(r => ({ id: r.id, unknownCount: r.unknownCount, ok: r.ok, error: (r as any).error }));
    const details: Record<string, string> = {};
    for (const r of results) details[r.id] = r.details || '';
    return { totalUnknown, providers: providersOut, details };
  });

  ipcMain.handle('repair-metadata-hex', async (_e, arg: { provider?: string; dryRun?: boolean }) => {
    const target = (arg?.provider || '').toLowerCase();
    const dryRun = !!arg?.dryRun;
    const targets = providers.filter(p => !target || p.id === target);
    const out: Array<{ id: string; planned: number; written: number; unknownCount: number; ok: boolean; error?: string }> = [];
    for (const p of targets) {
      const repairResult = await ResultUtils.fromPromise(
        p.repairMetadata(dryRun)
      );

      if (repairResult.success) {
        const r = repairResult.value;
        if (r.success) {
          out.push({ id: p.id, ok: true, planned: r.value.planned, written: r.value.written, unknownCount: r.value.unknownCount });
        } else {
          out.push({ id: p.id, ok: false, planned: 0, written: 0, unknownCount: 0, error: String(r.error || 'unknown error') });
        }
      } else {
        out.push({ id: p.id, ok: false, planned: 0, written: 0, unknownCount: 0, error: repairResult.error || 'exception' });
      }
    }
    const total = out.reduce((acc, r) => ({ planned: acc.planned + r.planned, written: acc.written + r.written, unknown: acc.unknown + r.unknownCount }), { planned: 0, written: 0, unknown: 0 });
    return { results: out, total };
  });
}

