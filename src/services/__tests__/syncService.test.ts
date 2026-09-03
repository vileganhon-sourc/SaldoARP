import { describe, it, expect, beforeEach, vi } from 'vitest';

// Polyfill de localStorage para ambiente Node no vitest
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = createLocalStorageMock();
}

import { getLastSyncMetadata, saveSyncMetadata, checkAndTriggerAutoSync } from '../syncService';

describe('syncService - Gestão de Sincronização e Auto-Sync', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ resultado: [], totalRegistros: 0, paginasRestantes: 0 })
    }));
  });

  it('deve retornar status IDLE por padrão quando não há sync prévio', () => {
    const meta = getLastSyncMetadata();
    expect(meta.status).toBe('IDLE');
  });

  it('deve salvar e recuperar metadados de sincronização corretamente', () => {
    const nowIso = new Date().toISOString();
    saveSyncMetadata({
      status: 'SUCCESS',
      totalAtas: 52,
      totalItens: 180,
      ultimoSyncEm: nowIso,
      mensagem: 'Sincronização realizada com sucesso'
    });

    const meta = getLastSyncMetadata();
    expect(meta.status).toBe('SUCCESS');
    expect(meta.totalAtas).toBe(52);
    expect(meta.totalItens).toBe(180);
    expect(meta.ultimoSyncEm).toBe(nowIso);
  });

  it('deve identificar quando o sync tem menos de 3 horas e NÃO disparar auto-sync', async () => {
    // Sync recente (há 30 minutos)
    const recentDate = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    saveSyncMetadata({
      status: 'SUCCESS',
      ultimoSyncEm: recentDate
    });

    const triggered = await checkAndTriggerAutoSync('200331');
    expect(triggered).toBe(false);
  });

  it('deve identificar quando o sync tem mais de 3 horas e disparar auto-sync', async () => {
    // Sync antigo (há 4 horas)
    const oldDate = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
    saveSyncMetadata({
      status: 'SUCCESS',
      ultimoSyncEm: oldDate
    });

    const triggered = await checkAndTriggerAutoSync('200331');
    expect(triggered).toBe(true);
  });
});
