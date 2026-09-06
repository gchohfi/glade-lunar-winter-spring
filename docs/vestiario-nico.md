# Vestiário do Nico — primeira coleção

Implementação e validação local em 6 de setembro de 2026.

## Entrega

Uma rota `/vestiario` reúne a coleção, os itens conquistados e os detalhes em uma janela de prévia. Não há seis telas separadas nem uma segunda árvore de progressão. A Home mantém as 12 etapas do campeonato e passa a mostrar a próxima conquista; os marcos também aparecem na etapa correspondente.

| Item | Disponibilidade |
| --- | --- |
| Bola clássica | Desde o início |
| Campo do clube | Desde o início |
| Bola de treino | Concluir Primeiro toque, etapa 1 |
| Campo ao entardecer | Concluir Bola na área, etapa 6 |

São dois itens iniciais e duas conquistas, sem compras e sem gastar XP. A seleção de uma etapa avançada ou a mudança de categoria pelos pais não libera o item: é necessário um resultado concluído, representado por 1–3 estrelas na etapa. Os marcos são a primeira hipótese de distribuição desta coleção, não uma medida de domínio pedagógico.

O Nico continua sendo o leão aprovado, com camisa branca do Corinthians, shorts pretos e sem lenço. Não há outro mascote, mudança de uniforme ou vantagem por equipamento.

## Interações

- “Ver no campo” abre a prévia com o mesmo componente de cenário utilizado na partida. Um item bloqueado pode ser experimentado, mas não equipado.
- Fechar a janela sem confirmar não altera o jogo. O foco retorna ao botão que abriu os detalhes.
- “Equipar no meu jogo” salva a escolha neste aparelho; o status confirma a gravação. Se o armazenamento falhar, o estado equipado não é alterado e a interface mostra o erro.
- “Meus itens” mostra apenas os itens disponíveis. “Coleção completa” inclui os próximos desbloqueios e explica seus requisitos.
- É possível voltar aos itens originais gratuitamente. A escolha aparece na Home, preparação, partida, treino e resultado.
- A primeira conclusão de um marco anuncia a nova conquista no resultado. Repetir a etapa não anuncia novamente o mesmo desbloqueio; um item novo nunca é equipado automaticamente.

## Dados e limites

O campo opcional `cosmetics: { ballId, fieldId }` é aditivo ao estado versão 2 e ao armazenamento existente. A migração usa os itens originais para dados antigos, IDs desconhecidos, categorias incompatíveis e itens ainda não conquistados. Não altera XP, nível, histórico, estrelas, recordes, contas, prêmio ou tempo.

O catálogo é a lista permitida de imagens. Não são aceitos endereços de imagem fornecidos por dados salvos. O estado normalizado acompanha o snapshot existente; esta entrega não altera autenticação, esquema do banco, isolamento de contas ou estratégia de sincronização. A garantia validada é local no aparelho. Login, sincronização real entre dispositivos e produção não foram validados nesta rodada.

Não há ranking, pagamento, oferta temporária, perda de progresso, penalidade por ausência ou incentivo a comprar tempo. O treino opcional continua sem alterar as recompensas.

## Design

Aplicação do design system de futebol já existente: paleta verde/creme/carvão, tipografia, espaçamento, superfícies e controles compartilhados. Em desktop, a prévia fica ao lado da coleção; em celular e iPad, a leitura é vertical. Status combinam texto e ícone. As janelas e abas usam os componentes acessíveis já instalados, com foco, nomes e regiões de status. A janela permanece dentro da altura disponível e permite rolagem em telas baixas.

Imagens finais e prompts: [Assets do Vestiário](assets-vestiario.md). A variação azul/prata rejeitada por falta de transparência real ficou fora do catálogo; não há placeholder para ela.

## Validação executada

- Build final sem conexão a banco externo: aprovado.
- Typecheck e lint dos arquivos alterados: aprovados.
- 36 testes focados aprovados: Vestiário (9), apresentação/campo (4), futebol/progresso (9), aprendizagem (11) e layout da equação (3).
- Suíte completa: 231 testes, 218 aprovados e as mesmas 13 falhas de template já registradas antes desta entrega. Distribuição: `check-auth-invariant` (1), `grok-pwa-plugin` (8), `migration-plan` (1), `with-app-env` (3). Não foram ocultadas nem modificadas nesta entrega.
- Atualização posterior: as 13 falhas foram corrigidas isolando os cenários de teste; a suíte completa passou com 270 testes. Veja o [relatório da correção](qa-test-suite-fix.md).
- Smoke em desenvolvimento e build: desktop 1280×800 e celular 390×844, resposta 200, sem overflow horizontal, sem erros de página/console, sem divergência material entre versões e sem alertas de marca/autenticação.
- Inspeção visual dos screenshots desktop e mobile. O smoke desktop compilado capturou o estado breve de carregamento; a revisão interativa posterior confirmou carregamento completo, controles ativos e imagens carregadas.
- Revisão interativa adicional em 320×568, 834×1194 e 1440×1000: sem overflow horizontal. Em 320px, a janela usa rolagem interna e permite fechar; o campo original permanece após cancelar a prévia.
- Equipar Bola de treino, recarregar, verificar na Home/treino e trocar de volta: aprovado em desenvolvimento. Repetido equipar/recarregar na versão compilada.
- Partida real compilada em 390×844 com Bola de treino: 15 respostas corretas, 5 gols, conclusão em 1:16 e resultado de +62 XP. No terceiro gol, a bola equipada chegou à posição `78% / 65%` da rede. Pergunta e resposta estavam visíveis junto ao teclado. Nenhum novo desbloqueio do Vestiário foi anunciado nessa repetição da etapa já concluída.
- A primeira liberação de item e a falha de armazenamento foram testadas com a lógica/loja de estado reais em testes isolados. Não se forjou progresso no navegador para liberar o campo de entardecer; ele foi verificado em prévia bloqueada, não em uma partida com campo desbloqueado.
- Escolhas originais restauradas após o playtest. O perfil local de teste da versão compilada mantém o resultado legítimo da partida de QA.

Evidências locais ficam em `screenshots/wardrobe-*`: relatórios de smoke, desktop final, iPad, prévia do entardecer no celular, gol com a bola equipada e resultado da partida. Esses arquivos de QA não fazem parte dos assets públicos do jogo.

## Fronteira de release

Build e playtest locais não são prova de publicação. O merge deve ser verificado separadamente no GitHub, com o commit exato; deploy real e sincronização de contas exigem validações próprias.
