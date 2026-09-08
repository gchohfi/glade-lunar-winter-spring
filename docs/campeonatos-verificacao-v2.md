# Campeonatos conectados — verificação da entrega

8 de setembro de 2026. Prévia local, sem merge, deploy ou publicação.

## Implementação

O contrato é `campeonatos-estrutura-v2.md`: quatro campeonatos, cinco partidas por campeonato, quinze acertos e cinco escolhas de chute por partida. Nico, campos, bolas e preços anteriores foram preservados. Home, partida, resultado, Campeonatos, Vestiário e Pais usam o mesmo percurso.

O protocolo 3 usa comandos com revisão esperada e identificador de operação. O servidor valida e grava estado, tentativa, revisão e registro de operações na mesma transação. As vinte partidas têm identificadores estáveis. A versão anterior continua como histórico, sem converter as doze etapas antigas em conclusões novas.

O banco temporário não confirma gravações nem importações. A prévia desta entrega usa PGlite persistente em disco, fora do repositório, compartilhado pelo servidor entre as sessões autenticadas. Não foram criados arquivos de ambiente, nem contornada a autenticação existente.

## Evidência executada

| Verificação | Resultado observado |
| --- | --- |
| Suíte automatizada final | 342 testes: 310 scripts e 32 de autenticação/app-data, sem falhas |
| Compilação | Build de produção concluído; banco de produção não acessado |
| Tipos e lint | Tipos aprovados; lint dos arquivos alterados sem erros, com um aviso de Fast Refresh em CloudSync |
| Copa do Bairro no navegador | Cinco partidas completas, 75 acertos, 25 chutes; próxima atividade abriu a Copa da Cidade |
| Moedas | Primeira partida do dia concedeu 30; quatro adicionais concederam zero |
| Ajuda e erro | Explicação, nova resposta e continuidade; relógio parado no feedback; gols anteriores mantidos |
| Três direções de chute | Esquerda, centro e direita acionadas; todas converteram o gol conquistado |
| Compra e equipamento | Bola dourada comprada por 30, equipada em ação separada, saldo e equipamento preservados ao recarregar |
| Troca entre clientes | Duas abas com identificadores de aparelho distintos; “Continuar aqui” recuperou 3 acertos, 1 gol e 2:44; cliente antigo não pôde continuar gravando |
| Expiração real | Relógio chegou a zero sem acelerar o tempo; resultado não concedeu moedas nem abriu a próxima partida |
| Nova tentativa | Começou com 0 acertos e tempo integral; após correção, relógio passou de 2:00 a 1:29 antes de qualquer resposta |
| Teclado físico | Digitação de 56 e Enter responderam corretamente a 7 × 8 |
| Interrupção do servidor | UI mostrou confirmação pendente e pausou; recuperação preservou 1 acerto e 0:38, sem cobrar o período de indisponibilidade |
| Conta e sessão | Cadastro e entrada pela interface real; sessão permaneceu válida durante os cinco jogos, além do limite de cinco minutos do cache |
| Pais | Cinco conclusões mantidas após expiração; tempo futuro restaurado para 3 minutos; histórico sem erros não aparece como dificuldade |

O teste de interrupção incluiu troca da execução compilada pela versão de desenvolvimento. Essa troca mudou os identificadores das funções do framework e exigiu recarregar a página; a operação pendente foi recuperada após o recarregamento. Não foi confundido com reconexão transparente entre versões diferentes.

Os testes de integração exercitam o serviço com banco em disco, incluindo fechamento e reabertura em processos separados, transações, rollback, repetição de operações, concorrência, transferência de tentativa, isolamento de contas, migração e manutenção do saldo. Os testes do cliente usam transporte/armazenamento simulados; são complementares ao teste real de interface, não substitutos.

## Revisão visual

Na versão compilada, conferidos 390 × 844, 834 × 1194 e 1440 × 1000: sem transbordamento horizontal. Conta e teclado ficam visíveis juntos; teclas numéricas no celular têm altura de 44 px. Isso simula dimensões de celular, iPad e computador; não é ensaio em três dispositivos físicos.

Capturas em `/Users/gabriela/Documents/Codex/2026-09-04/pu/outputs/course-qa/`:

- `home-ipad.png`
- `play-mobile.png`
- `play-ipad.png`
- `play-desktop.png`
- `timeout-ipad.png`
- `connection-paused.png`

Os cinco jogos e as capturas principais foram testados compilados. Ajustes finais de retomada do relógio, indicação dos pais e pausa já pausada foram retestados no desenvolvimento e incluídos no build final.

## Limites e próximos gates

1. A prévia usa um perfil sintético de teste. O histórico local encontrado não foi importado para essa conta. O responsável deve entrar na própria conta e confirmar a importação somente se aquele histórico realmente lhe pertencer.
2. O diário local de tempo é atualizado aproximadamente a cada 100 ms, e o servidor recebe checkpoints a cada 2 segundos de resposta. Em perda abrupta do aparelho, outro cliente recupera o último tempo confirmado; pode haver até cerca de 2 segundos ainda não enviados. O desenho não promete precisão submilissegundo nem prevenção absoluta contra cliente adulterado.
3. Postgres de produção e aparelhos físicos não foram acessados. Antes de publicar: aplicar/verificar `0003_course_sync.sql`, manter segredo de autenticação estável, verificar conta real em dois aparelhos e confirmar continuidade após reinício do servidor. Fallback em memória é bloqueado e não serve como prova de sincronização.
4. Aprovação visual da responsável e playtest com a criança ainda são necessários. Medir se ela inicia a próxima partida sozinha e melhora as primeiras respostas sem ajuda em dias diferentes. Conclusão, velocidade e moedas não certificam domínio.

Nenhuma publicação é autorizada por este relatório. A entrega permanece disponível para revisão local.
