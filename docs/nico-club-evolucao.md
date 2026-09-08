# Meu clube — missões, escolhas e aprendizagem

Implementação de 8 de setembro de 2026. Público: criança de 10 anos aprendendo as tabuadas e divisões do curso existente.

## Objetivo e limite da entrega

Dar uma razão compreensível para voltar: uma pequena missão, evidência de melhora e uma escolha visual que aparece no jogo. Retorno voluntário e aprendizagem precisam ser validados com a criança; código, testes e uma compra funcionando não provam engajamento diário.

Não há anúncios, dinheiro real, ranking público, chat, sorteios, ofertas com prazo ou perda de itens por ausência. O Nico aprovado e o currículo existente foram preservados. Autenticação e sincronização não foram substituídas por outra arquitetura.

## Fluxo real

1. Na Home, ver missão, foco da partida e uma próxima conquista.
2. No Vestiário, experimentar no campo e escolher uma meta opcional.
3. Jogar a partida normal de 15 acertos e cinco gols. Três contas do foco são inseridas entre as dez primeiras posições do baralho, intercaladas com outras contas.
4. Ver o resultado: moedas, primeiras respostas corretas do foco e contas lembradas em relação a outros dias.
5. Confirmar uma compra com saldo suficiente, depois equipar explicitamente. A escolha aparece na Home, partida, treino e resultado.

## Economia transparente

| Conquista                                                                 | Moedas | Limite                |
| ------------------------------------------------------------------------- | ------ | --------------------- |
| Completar uma partida de matemática com 15 respostas corretas             | 20     | Uma concessão por dia |
| Na partida completa, acertar de primeira as três contas distintas do foco | 10     | Uma concessão por dia |

Até 30 moedas por dia; sem moeda por login, tempo de tela ou treino livre. O calendário é America/Sao_Paulo e a conclusão é atribuída ao dia do término. Repetição do resultado não duplica nem XP nem moedas; a trilha diária de concessões continua após recarregar. Não há crédito retroativo inventado para resultados antigos.

XP, nível, estrelas, prêmio familiar e evidência de aprendizagem nunca são gastos. Os quatro cosméticos anteriores mantêm seus requisitos gratuitos. Novas escolhas:

- Bola dourada: 30 moedas — possível após a primeira missão com foco concluído.
- Bola de gelo: 60 moedas.
- Noite de jogo: 80 moedas.
- Arena esmeralda: 100 moedas.

Preços são uma hipótese inicial de produto, não uma economia comprovadamente ótima. Compra inválida ou sem saldo não altera nada. Compra e equipamento só são confirmados após gravação local; falha de gravação da missão é mostrada, preservando o resultado em memória.

## Personalização pedagógica

`coaching.ts` usa o histórico existente, respeitando as operações permitidas na categoria selecionada. Contas com dificuldade recente recebem prioridade; contas já vistas voltam para revisão; sem histórico, alternam-se pequenas tabuadas de entrada. Três fatos de foco entram na partida variada existente, sem transformar o jogo em repetição exclusiva de uma conta.

O intervalo de revisão cresce com os dias de acerto independente: 2, 2, 4, 7, 14, 21, 28 e 30 dias. É uma regra simples e auditável, não um modelo de IA nem uma garantia de retenção. Mesmo conteúdos com mais evidência retornam para revisão.

Somente a primeira tentativa de cada conta na partida pode acrescentar um dia de evidência. Errar, ver a resposta e acertá-la na repetição não conta como resposta independente. Várias partidas no mesmo dia continuam contando como um único dia por conta. Estatísticas antigas não são reinterpretadas como evidência nova. O painel dos pais distingue dois ou três dias de acerto independente, sem chamar isso de diagnóstico de domínio.

O treino de cinco contas com explicações continua opcional e sem recompensa. O tempo, categorias e progressão do curso existente não foram alterados nesta rodada.

## Design e assets

Uma linguagem de clube com verde profundo, superfícies claras, tipografia e componentes existentes. Uma ação principal por momento; a conclusão convida a aproveitar as conquistas e encerrar. Meta, saldo, preço e requisitos são dados reais. Não há saldo de demonstração no produto.

As quatro novas imagens e o contrato de recorte de apresentação das bolas estão documentados em [Assets](club-assets.md). As bolas novas usam máscara circular na interface; os arquivos RGB não são sprites com alfa e não devem ser usados sem essa máscara.

## Validação com a criança — próxima etapa

Verificação técnica executada: 293 testes automatizados aprovados (261 de scripts e 32 de dados/autenticação), TypeScript sem erros, build de produção concluído e configuração de autenticação consistente entre desenvolvimento e build. Revisão visual em 390, 834 e 1440 px, sem transbordamento horizontal. Partida completa de 15 acertos realizada pela interface tanto no desenvolvimento quanto no build; foco 3/3, concessão de 30 moedas, confirmação de compra da Bola dourada, equipamento e recarregamento preservaram saldo e coleção. As quatro novas imagens carregaram; o console da sessão final compilada não apresentou erros ou avisos.

Escopo desta evidência: prévias locais com perfis de teste, não publicação em produção nem teste com a criança. A coleção é confirmada neste aparelho; sincronização confiável entre aparelhos continua fora desta entrega. A verificação visual usou o navegador integrado disponível, preservando o outro projeto que já ocupava a porta 8080.

Em cinco a sete sessões curtas, observar: encontra sozinho a missão? Entende como conquistar o item? Consegue explicar uma conta? Lembra dela em outro dia? Volta por vontade própria? Encerra sem conflito?

Comparar acertos independentes e necessidade de ajuda; não perseguir apenas velocidade ou minutos de uso. Se o jogo gerar frustração, ajustar dificuldade e duração antes de aumentar recompensas. Sem telemetria externa acrescentada nesta entrega.
