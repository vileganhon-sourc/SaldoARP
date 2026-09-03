import { describe, it, expect } from 'vitest';
import { matchAtaNumber } from '../api';

describe('matchAtaNumber - Normalização e Busca de Atas', () => {
  it('deve retornar true para query vazia ou indefinida', () => {
    expect(matchAtaNumber('00041/2025', '')).toBe(true);
    expect(matchAtaNumber('00041/2025', undefined)).toBe(true);
  });

  it('deve casar formatos exatos e com zeros à esquerda', () => {
    expect(matchAtaNumber('00041/2025', '00041/2025')).toBe(true);
    expect(matchAtaNumber('00041/2025', '41/2025')).toBe(true);
    expect(matchAtaNumber('00041/2025', '041/2025')).toBe(true);
  });

  it('deve diferenciar atas de anos distintos com mesmo número', () => {
    expect(matchAtaNumber('00041/2026', '41/2025')).toBe(false);
    expect(matchAtaNumber('00041/2024', '41/2025')).toBe(false);
    expect(matchAtaNumber('00041/2025', '41/2025')).toBe(true);
  });

  it('deve casar quando o usuário digita apenas o número', () => {
    expect(matchAtaNumber('00041/2025', '41')).toBe(true);
    expect(matchAtaNumber('00041/2025', '00041')).toBe(true);
    expect(matchAtaNumber('00064/2024', '64')).toBe(true);
    expect(matchAtaNumber('00064/2024', '65')).toBe(false);
  });

  it('deve suportar busca por substring textual', () => {
    expect(matchAtaNumber('00041/2025', '00041')).toBe(true);
    expect(matchAtaNumber('00041/2025', '2025')).toBe(true);
  });
});
