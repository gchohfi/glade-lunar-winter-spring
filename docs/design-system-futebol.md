# Design system — Centro de treinamento

Evolução visual do Missão Tabuada, sem alterar regras, XP, progressão ou dados salvos.

## Linguagem

Superfícies neutras, verde de clube para ações, placar em carvão e tipografia legível. O gramado tem cor e profundidade; os controles permanecem sóbrios. Nico continua sendo o leão aprovado, com camiseta branca e shorts pretos do Corinthians, sem lenço. Não representa parceria com o clube.

## Tokens (src/styles.css)

| Papel                    | Valor                                                                  |
| ------------------------ | ---------------------------------------------------------------------- |
| Fundo / superfície       | #f3f5f2 / #ffffff                                                      |
| Texto / texto secundário | #202c29 / #5d6c65                                                      |
| Ação / texto sobre ação  | #225841 / #ffffff                                                      |
| Linha / superfície suave | #dce3dd / #eaf0e9                                                      |
| Espaçamento              | 4, 8, 12, 16, 24, 32 px                                                |
| Raios                    | 4, 8, 12, 16, 24, 32 px                                                |
| Fontes                   | Lexend (interface), Bricolage Grotesque (títulos e conta)              |
| Movimento                | 150 ms (controles), 250 ms (feedback), 300 ms (bola), 400 ms (entrada) |

## Componentes e estados

- Cabeçalho da partida: etapa atual, tempo restante e acertos identificados por texto. Barra fina mostra o tempo; abaixo de 10 segundos muda para o estado de atenção já existente.
- FootballPitch: placar, cenário contínuo em 3:1, Nico com sombra de contato, bola compartilhada e trilha “passe → passe → chute”. Posição e tamanho da bola acompanham a perspectiva. Somente apresentação: gols continuam derivados dos acertos, nunca da animação.
- FootballBall: sprite WebP transparente, com sombra gerada pela interface, compartilhado entre partida e cenas da Home/vestiário/resultado.
- Sequência: estados futura, atual e concluída; número, texto, check e `aria-current` evitam depender somente da cor.
- Conta: cartão claro, tamanho dedicado `.mission-equation`, resposta visível ao lado; estados correto/erro preservam o tamanho da pergunta e trazem feedback textual.
- NumberPad: usa o Button existente; teclas com 48–60 px, borda de apoio, hover, foco visível, pressionamento e desabilitado. Vírgula e apagar têm nomes acessíveis. O teclado físico continua funcionando.
- Treino: reaproveita o mesmo campo, conta e controles, sem simular gols, cronômetro ou ganhos. Explicações continuam abertas até a criança escolher continuar.

## Responsividade e segurança

O cabeçalho é independente do conteúdo. A partir de 768 px, resposta e campo ficam lado a lado; abaixo disso, empilham sem sobreposição. O grid preserva a altura natural da conta. Telas muito baixas podem rolar; não fixar altura de células nem esconder conteúdo para caber. Movimento reduzido desativa o deslocamento e animações decorativas. Ornamentos têm `aria-hidden`/alt vazio e não substituem os textos de placar.

## Assets

Campo e bola novos: ver `design-assets-football-v2.md` para prompts, procedência e dimensões. O panorama mantém 3:1 para que o gol e a trajetória coincidam; não recortar com `cover` durante a partida. As poses do Nico e o estádio das cenas de apresentação foram preservados.

## Fora desta alteração

Loja, inventário, moedas, novos mascotes, ranking, currículo, duração da sessão e regras de recompensa. Essas propostas precisam de uma decisão de produto separada.
