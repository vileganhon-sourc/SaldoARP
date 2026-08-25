async function testVercelLive() {
  console.log("--- TESTANDO DEPLOY VERCEL EM PRODUÇÃO (https://saldo-arp.vercel.app) ---");

  // 1. Testar se a rota principal está respondendo 200
  try {
    const resRoot = await fetch('https://saldo-arp.vercel.app');
    console.log(`1. Rota Principal HTTP Status: ${resRoot.status} ${resRoot.statusText}`);
  } catch (e) {
    console.error("❌ Erro ao acessar rota principal na Vercel:", e.message);
  }

  // 2. Testar o proxy rewrite da Vercel para compras.gov.br (/api-arp)
  try {
    const resArp = await fetch('https://saldo-arp.vercel.app/api-arp/modulo-arp/1_consultarARP?pagina=1&tamanhoPagina=2&codigoUnidadeGerenciadora=200331&dataVigenciaInicialMin=2024-01-01&dataVigenciaInicialMax=2024-12-31');
    console.log(`2. Proxy Vercel -> Compras.gov.br HTTP Status: ${resArp.status}`);
    if (resArp.ok) {
      const data = await resArp.json();
      console.log("   ✅ Proxy Compras.gov.br funcionando! Total registros retornados:", data.resultado?.length || 0);
    } else {
      console.log("   ⚠️ Proxy Compras.gov.br retornou status:", resArp.status);
    }
  } catch (e) {
    console.error("❌ Erro no proxy Compras.gov.br:", e.message);
  }

  // 3. Testar o proxy rewrite da Vercel para PNCP (/api-pncp)
  try {
    const resPncp = await fetch('https://saldo-arp.vercel.app/api-pncp/api/pncp/v1/orgaos/00394494000136/compras/2024/1130/atas/17/contratos');
    console.log(`3. Proxy Vercel -> PNCP HTTP Status: ${resPncp.status}`);
    if (resPncp.ok) {
      const data = await resPncp.json();
      console.log("   ✅ Proxy PNCP funcionando! Resposta recebida do PNCP.");
    } else {
      console.log("   ⚠️ Proxy PNCP retornou status:", resPncp.status);
    }
  } catch (e) {
    console.error("❌ Erro no proxy PNCP:", e.message);
  }
}

testVercelLive();
