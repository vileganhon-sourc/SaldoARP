/**
 * Converte identificadores de contratos no PNCP para a URL padrão oficial da aplicação PNCP:
 * Padrão correto: https://pncp.gov.br/app/contratos/{cnpj}/{ano}/{sequencial}
 * Exemplo:
 *  Input:  00394494000136-2-001456/2026
 *  Output: https://pncp.gov.br/app/contratos/00394494000136/2026/1456
 */
export function formatPncpContractUrl(
  cnpj?: string,
  ano?: string | number,
  sequencialContrato?: string | number,
  numeroControlePncp?: string,
  rawLink?: string
): string {
  // 1. Se temos os campos estruturados (cnpj, ano e sequencialContrato)
  if (cnpj && ano && sequencialContrato !== undefined && sequencialContrato !== null && String(sequencialContrato).trim() !== '') {
    const cleanCnpj = String(cnpj).replace(/\D/g, '').padStart(14, '0');
    const cleanAno = String(ano).trim();
    const rawSeq = String(sequencialContrato).trim();
    const cleanSeq = String(parseInt(rawSeq, 10) || rawSeq.replace(/^0+/, ''));
    if (cleanCnpj && cleanAno && cleanSeq) {
      return `https://pncp.gov.br/app/contratos/${cleanCnpj}/${cleanAno}/${cleanSeq}`;
    }
  }

  // 2. Se temos numeroControlePncp ou rawLink (ex: "00394494000136-2-001456/2026")
  const source = (numeroControlePncp || rawLink || '').trim();
  if (source) {
    // Trata formato oficial do PNCP: {CNPJ}-2-{SEQUENCIAL}/{ANO}
    const match = source.match(/(\d{14})-2-0*(\d+)\/(\d{4})/);
    if (match) {
      const parsedCnpj = match[1];
      const parsedSeq = match[2];
      const parsedAno = match[3];
      return `https://pncp.gov.br/app/contratos/${parsedCnpj}/${parsedAno}/${parsedSeq}`;
    }

    // Se já for URL no formato novo: https://pncp.gov.br/app/contratos/{cnpj}/{ano}/{sequencial}
    const matchNew = source.match(/pncp\.gov\.br\/app\/contratos\/(\d{14})\/(\d{4})\/(\d+)/);
    if (matchNew) {
      return `https://pncp.gov.br/app/contratos/${matchNew[1]}/${matchNew[2]}/${matchNew[3]}`;
    }

    // Se for URL no formato antigo: https://pncp.gov.br/app/contratos/{cnpj}-2-{sequencial}/{ano}
    const matchOldUrl = source.match(/pncp\.gov\.br\/app\/contratos\/(\d{14})-2-0*(\d+)\/(\d{4})/);
    if (matchOldUrl) {
      return `https://pncp.gov.br/app/contratos/${matchOldUrl[1]}/${matchOldUrl[3]}/${matchOldUrl[2]}`;
    }
  }

  return '';
}
