# Treinar com Nico

Rodada aprovada pelo usuário após análise do material de dinâmica de tabuada. Mantém o futebol e o leão oficial, sem novos personagens, rankings ou punições.

## Experiência

- Entrada pela Home, pelo resultado da partida ou pelo painel dos pais, em `/treino`.
- Cinco contas da etapa selecionada, priorizando as que têm erros no histórico elegível.
- Sem cronômetro. O botão “Me ensina, Nico” e uma resposta errada abrem a explicação.
- Decomposição na multiplicação, relação inversa na divisão inteira e separação de metades nas divisões com vírgula.
- As explicações são calculadas a partir da própria conta, sem serviço de IA ou conteúdo arbitrário. Exemplo: 6 × 7 = 6 × 5 + 6 × 2 = 30 + 12 = 42.
- A explicação permanece até “Entendi, vou tentar”. O acerto também espera “Próxima jogada”. Depois de usar ajuda, a próxima pergunta é semelhante e mantém o tipo de estratégia, quando houver outra elegível.
- Nico permanece dentro do campo; o treino mostra jogadas resolvidas, não gols de uma partida valendo recompensa.

## Fronteiras de progresso

O treino assistido usa estado temporário, reinicia ao sair/recarregar e não grava no histórico. Não concede XP, estrelas, meta diária, desbloqueios ou prêmio; não polui medidas de velocidade com respostas apoiadas por dicas. Isso é informado antes de começar. A partida principal continua com 15 acertos, cinco gols e o mesmo relógio.

Os registros e os identificadores existentes não mudam. As novas seleções de contas respeitam:

| Categoria | Conteúdo |
| --- | --- |
| Base | Multiplicação de 3 a 13 |
| Promessa | Multiplicação e divisões inteiras |
| Titular em diante | Conteúdo anterior e metades com vírgula |

É uma decisão de sequência do produto, não uma alegação de validação curricular ou pedagógica. Registros antigos de divisão em Base permanecem intactos.

## Pais

Resumo dos últimos sete dias, incluindo hoje, e dos sete anteriores: precisão ponderada por respostas, partidas completas e tempo médio de partidas completas disponíveis no histórico. Ausência de dados aparece como “Sem respostas” ou “Sem partidas completas”, nunca como zero de desempenho. O histórico guarda até 60 partidas; diferenças de dificuldade limitam comparações de tempo. O treino assistido não entra nesses números. Categoria e descrição passam a refletir a etapa selecionada.

## Verificação e limites

- Testes cobrem as explicações de todas as contas elegíveis em todas as categorias, a igualdade dos resultados, a seleção das contas, a progressão, entrada decimal, ajuda persistente, confirmação, proteção contra dupla resposta e ausência de alteração no progresso.
- Treino de cinco jogadas realizado no navegador, com erro, explicação, nova tentativa e conta relacionada. Home antes/depois permaneceu idêntica.
- Build local e typecheck aprovados; testes do jogo, treino e proteção de layout aprovados. A suíte geral continua com 13 falhas de template já documentadas nos PRs anteriores; não foram desativadas.
- 23 testes direcionados aprovados, incluindo rejeição de respostas decimais apenas aproximadas no treino. Treino completo de cinco jogadas também realizado no build final; checagens de entrada em desktop/celular sem erros nem divergência entre desenvolvimento e build.
- Pergunta e explicação verificadas sem sobreposição em 390×844, 808×739, 768×700, 1024×768, 1280×800 e 320×568. Telas muito baixas podem exigir rolagem. Na partida principal, três respostas corretas continuaram marcando exatamente um gol.
- Verificações em desenvolvimento e build não comprovam produção, login real ou sincronização entre aparelhos. Auth, banco, controle parental e notificações externas não foram alterados.
