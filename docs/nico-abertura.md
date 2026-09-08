# Abertura do Nico — integração na prévia

## Comportamento

- Filme fornecido pela responsável, completo: 9,8 segundos, 1280 × 720.
- Cópia byte a byte em `public/mascots/nico-leao/entrada-v1.mp4`. O original em Downloads não foi alterado.
- SHA-256: `b39e66ab893eb35477ed0f24d9bb36775e1fc96095ab7e9439b72ea821d67255`.
- Poster extraído do primeiro quadro, em 1280 × 720, para carregamento e alternativa estática.
- Abertura automática apenas na Home, após carregar a conta e seu progresso, uma vez por dia de São Paulo, por conta e navegador/aparelho.
- A marca de apresentação é local e versionada, separada do progresso pedagógico. Não existe promessa de sincronização dessa preferência entre aparelhos. Se o armazenamento estiver bloqueado, a marca permanece durante aquela sessão da página.
- “Entrar no jogo” disponível desde o início; Escape também fecha o diálogo. “Ver abertura do Nico” permite reprodução voluntária na Home, sem alterar a marca diária.
- Encerrar, pular ou usar a versão estática mantém a Home e devolve o foco ao botão principal. Nenhuma partida é iniciada e nenhum gol, moeda ou resultado é registrado pela abertura.
- O vídeo não corta as laterais: mantém a proporção e usa enquadramento inteiro em celular, iPad e computador.
- Reprodução inicialmente sem áudio; ativação por gesto somente se o som estiver permitido nos Pais. O controle não altera a preferência salva do responsável.
- Pausa manual, suspensão quando a página fica oculta e alternativa “Ver sem animação”. A preferência do sistema por movimento reduzido evita montar o vídeo e apresenta apenas o poster.
- Bloqueio de reprodução automática permite iniciar manualmente. Erro ou espera de carregamento prolongada apresenta o poster; o botão de entrada continua disponível.

## Verificação executada

- Dez testes novos: frequência diária, virada do dia em São Paulo, separação entre contas, interrupção/pulo, armazenamento indisponível/corrompido, preservação de dados, arquivos reais e contratos de integração.
- Suíte completa: 333 testes de scripts + 32 de autenticação/dados, todos aprovados. Os dez testes da abertura foram repetidos após o refinamento da pausa manual.
- Build de distribuição compilado sem acessar banco remoto. Nenhum merge ou deploy realizado.
- Análise estática dos arquivos alterados: aprovada.
- `npm run typecheck` global: bloqueado por 11 erros preexistentes nas cópias `src/components/cloud-sync 2.tsx` e `src/components/parent-panel 2.tsx`. Essas cópias foram preservadas. A checagem diagnóstica dos 113 arquivos canônicos, excluindo dez cópias com sufixo numérico, retornou zero erros; isso não substitui a pendência do comando global.
- Prévia real: vídeo decodificado com 9,8 s e 1280 × 720; reprodução, pausa, ativação/desativação de som, versão estática, pulo, não repetição após recarregar e conclusão automática na Home.
- Retorno confirmado à Home com foco em “Jogar mais, se quiser”, sem nova tentativa, mantendo a próxima partida já existente.
- Layout e capturas conferidos em 390 × 844, 834 × 1194 e 1440 × 1000. Controles medidos em 48 px, sem transbordamento horizontal.
- Sem erros de console na conferência da prévia. Verificação de marca aprovada, sem mudar Nico ou os assets existentes.

## Limites da entrega

- Validação visual executada na prévia de desenvolvimento. O build compilou, mas sua reprodução em uma prévia separada de distribuição não foi revalidada no navegador; não equivale à homologação de produção.
- Preferência de movimento reduzido, falha de mídia e bloqueio de autoplay possuem tratamento e testes de contrato; os cenários de sistema/navegador não foram todos simulados em aparelhos físicos.
- Não foi produzida ou inserida uma nova animação de passagem de fase. Esta entrega integra somente o filme de entrada aprovado.
- Cópias antigas e demais alterações já existentes na área de trabalho permanecem fora do escopo. A limpeza/atribuição dessas cópias e a aprovação da responsável continuam necessárias antes de uma publicação.
