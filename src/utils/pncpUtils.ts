/**
 * Converte identificadores oficiais de contratos no PNCP para a URL padrão oficial:
 * Padrão oficial: https://pncp.gov.br/app/contratos/{cnpj}/{ano}/{sequencial}
 * 
 * Regra de Negócio:
 * 1. Se PNCP forneceu numeroControlePncp -> usar o oficial
 * 2. Se PNCP forneceu linkVisualizacao -> usar o oficial
 * 3. Caso contrário -> NÃO fabricar URL (retorna vazio)
 */
export function formatPncpContractUrl(
  numeroControlePncp?: string,
  linkVisualizacao?: string
): string {
  // 1. Se PNCP forneceu numeroControlePncp -> extrai e monta a URL oficial
  const numControle = (numeroControlePncp || '').trim();
  if (numControle) {
    // Trata formato oficial do PNCP: {CNPJ}-2-{SEQUENCIAL}/{ANO} (ex: 00394494000136-2-001456/2026)
    const match = numControle.match(/(\d{14})-2-0*(\d+)\/(\d{4})/);
    if (match) {
      const parsedCnpj = match[1];
      const parsedSeq = String(parseInt(match[2], 10) || match[2].replace(/^0+/, ''));
      const parsedAno = match[3];
      return `https://pncp.gov.br/app/contratos/${parsedCnpj}/${parsedAno}/${parsedSeq}`;
    }

    // Se já for URL no formato novo: https://pncp.gov.br/app/contratos/{cnpj}/{ano}/{sequencial}
    const matchNew = numControle.match(/pncp\.gov\.br\/app\/contratos\/(\d{14})\/(\d{4})\/(\d+)/);
    if (matchNew) {
      const parsedSeq = String(parseInt(matchNew[3], 10) || matchNew[3]);
      return `https://pncp.gov.br/app/contratos/${matchNew[1]}/${matchNew[2]}/${parsedSeq}`;
    }

    // Se for URL no formato antigo: https://pncp.gov.br/app/contratos/{cnpj}-2-{sequencial}/{ano}
    const matchOldUrl = numControle.match(/pncp\.gov\.br\/app\/contratos\/(\d{14})-2-0*(\d+)\/(\d{4})/);
    if (matchOldUrl) {
      const parsedSeq = String(parseInt(matchOldUrl[2], 10) || matchOldUrl[2]);
      return `https://pncp.gov.br/app/contratos/${matchOldUrl[1]}/${matchOldUrl[3]}/${parsedSeq}`;
    }
  }

  // 2. Se PNCP forneceu linkVisualizacao -> valida/formata e usa o oficial
  const rawLink = (linkVisualizacao || '').trim();
  if (rawLink) {
    const matchNew = rawLink.match(/pncp\.gov\.br\/app\/contratos\/(\d{14})\/(\d{4})\/(\d+)/);
    if (matchNew) {
      const parsedSeq = String(parseInt(matchNew[3], 10) || matchNew[3]);
      return `https://pncp.gov.br/app/contratos/${matchNew[1]}/${matchNew[2]}/${parsedSeq}`;
    }

    const matchOldUrl = rawLink.match(/pncp\.gov\.br\/app\/contratos\/(\d{14})-2-0*(\d+)\/(\d{4})/);
    if (matchOldUrl) {
      const parsedSeq = String(parseInt(matchOldUrl[2], 10) || matchOldUrl[2]);
      return `https://pncp.gov.br/app/contratos/${matchOldUrl[1]}/${matchOldUrl[3]}/${parsedSeq}`;
    }

    const matchPattern = rawLink.match(/(\d{14})-2-0*(\d+)\/(\d{4})/);
    if (matchPattern) {
      const parsedSeq = String(parseInt(matchPattern[2], 10) || matchPattern[2]);
      return `https://pncp.gov.br/app/contratos/${matchPattern[1]}/${matchPattern[3]}/${parsedSeq}`;
    }

    if (rawLink.startsWith('http://') || rawLink.startsWith('https://')) {
      return rawLink;
    }
  }

  // 3. Caso contrário -> NÃO fabricar URL
  return '';
}
