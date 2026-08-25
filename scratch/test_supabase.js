import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bouutpmxexvwppcmmhdi.supabase.co';
const supabaseAnonKey = 'sb_publishable_5nqKXMxqJnldoT4Wy5w-gg_T85JiyuT';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runVerification() {
  console.log("--- TESTANDO CONEXÃO E RLS DO SUPABASE ---");
  
  // 1. Inserir dado de teste
  const testId = 'test-' + Date.now();
  const testKey = 'test-item-key-123';
  
  const { data: insertData, error: insertError } = await supabase
    .from('arp_allocations')
    .insert([
      {
        id: testId,
        item_key: testKey,
        unit_name: 'Unidade Teste de Diagnóstico',
        allocated_qty: 10,
        empenhada_qty: 2
      }
    ])
    .select();

  if (insertError) {
    console.error("❌ ERRO NA INSERÇÃO (Supabase):", insertError);
  } else {
    console.log("✅ INSERÇÃO COM SUCESSO (Supabase):", insertData);
  }

  // 2. Consultar dado de teste
  const { data: selectData, error: selectError } = await supabase
    .from('arp_allocations')
    .select('*')
    .eq('item_key', testKey);

  if (selectError) {
    console.error("❌ ERRO NA LEITURA (Supabase):", selectError);
  } else {
    console.log("✅ LEITURA COM SUCESSO (Supabase):", selectData);
  }

  // 3. Deletar dado de teste
  const { error: deleteError } = await supabase
    .from('arp_allocations')
    .delete()
    .eq('id', testId);

  if (deleteError) {
    console.error("❌ ERRO NA DELEÇÃO (Supabase):", deleteError);
  } else {
    console.log("✅ DELEÇÃO COM SUCESSO (Supabase)");
  }

  console.log("--- TESTE FINALIZADO ---");
}

runVerification();
