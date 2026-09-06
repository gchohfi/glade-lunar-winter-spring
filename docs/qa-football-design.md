# Verificação — campo e design system

## Escopo

Somente apresentação: campo, bola, Nico, placar, cabeçalho, conta, teclado e vestiário. Sem mudança em operações, tempo, XP, níveis, desbloqueios, persistência ou autenticação.

## Verificações executadas

- Typecheck e lint dos componentes alterados: passaram.
- 27 testes focados (futebol, aprendizado, layout e novos contratos visuais): passaram.
- Build final com `DATABASE_URL` ausente: passou; nenhuma migração remota executada.
- Smoke em `/play` no desenvolvimento e no build local: desktop 1280×800 e mobile 390×844, sem erros de console, sem overflow, sem divergência de conteúdo. Ambas as capturas de desenvolvimento inspecionadas visualmente.
- Imagens do campo, bola e Nico carregadas no build: `complete` e dimensões naturais válidas. A primeira captura imediata de entrada aconteceu antes de carregar as imagens; descartada e refeita após carregamento confirmado.
- Partida no build concluída com 15 acertos: primeiro gol observado como `Gols 1/5`, bola em x78%, y65%; resultado final de quinze acertos, 0:41 e +192 XP. Perfil de teste do build local, separado da origem de desenvolvimento.
- Erro no build: `9 × 10`, resposta enviada `0`, resposta correta revelada `90`, placar permaneceu `Gols 0/5`. Saída antes da conclusão dessa segunda partida.
- Treino de desenvolvimento: explicação aberta e visível em 808×739; depois treino completo de cinco questões sem cronômetro. Uma tentativa inicial foi reiniciada durante atualização local; teste final repetido após o build.
- Layout do treino: 320×568, 390×844, 768×700, 808×739, 1024×768, 1440×900. Layout da partida: 320×568, 390×844, 808×739, 1024×768, 1280×720. Em todos, viewport real confirmado, equação sem obstrução, sem interseção com teclado e sem overflow horizontal. Telas baixas podem rolar verticalmente.
- Console da partida compilada: nenhum erro.

## Limites

A suíte geral de scripts ainda contém 13 falhas pré-existentes dos contratos do template (branding, configuração de auth e migrations), separadas dos 27 testes focados aprovados. Não houve teste com crianças, validação curricular, teste de leitor de tela, alteração de autenticação ou comprovação de sincronização familiar. Build local não comprova publicação em produção.

Capturas em `screenshots/stadium-v2-*` são evidências locais, não assets do aplicativo. Especificação visual: `design-system-futebol.md`; prompts e procedência: `design-assets-football-v2.md`.
