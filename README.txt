==========================================
  RPAutomation | Sistema Anne
  Automação de Clipping de RP - Eurofarma
==========================================


COMO USAR EM QUALQUER COMPUTADOR
─────────────────────────────────

1. COPIE a pasta "rpautomation" inteira para o outro computador
   (pode usar pen drive, rede, etc.)

2. No computador destino, instale o Node.js SE ainda não tiver:
   → Acesse https://nodejs.org
   → Baixe a versão "LTS" (botão verde)
   → Instale normalmente e reinicie o computador

3. Abra a pasta "rpautomation" e dê DOIS CLIQUES em:
   → Iniciar.bat   (Windows)
   → Iniciar.sh    (Mac ou Linux)

4. Na PRIMEIRA vez, o sistema vai instalar as dependências e
   compilar o projeto automaticamente (3-7 minutos).
   Nas próximas vezes, abre em segundos.

5. O navegador abre automaticamente em:
   http://localhost:3000


ARQUIVOS DO LAUNCHER
────────────────────
  Iniciar.bat     → Inicia o sistema (Windows)
  Iniciar.sh      → Inicia o sistema (Mac/Linux)
  Reconstruir.bat → Use se houver erros: apaga e reinstala tudo


DICAS
─────
• NÃO feche a janela preta (terminal) enquanto estiver usando.
  Fechar ela encerra o servidor.

• Se a porta 3000 já estiver ocupada, encerre outros processos
  ou reinicie o computador e tente novamente.

• Para compartilhar SEM precisar de internet no destino:
  copie a pasta incluindo "node_modules" e ".next".
  O arquivo ficará maior (~350MB) mas funciona offline.

• Para compartilhar com tamanho mínimo (~10MB):
  copie SEM "node_modules" e SEM ".next".
  Na primeira execução no destino, o sistema baixa o que falta.


REQUISITOS
──────────
  Node.js 18 ou superior (https://nodejs.org)
  Conexão com internet (somente na primeira execução de cada máquina)
  Windows 10/11 ou Mac ou Linux


==========================================