# Futebol com Nico — entrega local

O futebol substitui o universo espacial na interface do Missão Tabuada. Nico mantém o visual aprovado: leão 3D dourado, camiseta branca e shorts pretos do Corinthians, patas descalças e sem lenço. O personagem aparece no campo, acompanha as jogadas e comemora os gols.

## Experiência implementada

- Entrada no time, treino diário, partida, campeonato, conquistas e painel dos pais com a mesma linguagem.
- Cinco capítulos: Entrada em campo, Centro de treinamento, Partida do dia, Campeonato pessoal e Sala de troféus.
- Doze etapas desbloqueáveis. Cada partida continua exigindo quinze acertos.
- Dois passes e um chute fazem um gol: cada três acertos geram um gol, até cinco. O placar deriva das respostas registradas; a animação não concede pontos.
- Resposta errada: Nico incentiva, mostra o resultado e a conta volta ao treino. Não remove gols.
- Conquistas nos níveis já existentes e prêmio real combinado em família a cada dez partidas completas.
- Divisão e vírgula decimal corrigidas; resposta confirmada explicitamente, evitando aceitar 5 antes de digitar 5,5. Uma resposta não pode contar duas vezes durante a transição.
- Temporizadores de feedback cancelados ao sair da partida. Teclado de toque e teclado físico mantidos.

## Compatibilidade

Os identificadores e índices antigos, a chave missao-tabuada-v1, os níveis, as regras de XP, estrelas, recordes, sequência e recompensa foram preservados. Os nomes internos Planet/Ship e selectedPlanet continuam como adaptadores de dados, não como conceitos visíveis. Não há migração destrutiva nem reinicialização de progresso.

As antigas imagens espaciais permanecem guardadas, mas as telas não as utilizam. Avisos de sistema antigos são traduzidos para a apresentação nova sem regravar o histórico.

## Verificação em 05/09/2026

- Typecheck e lint dos arquivos alterados: aprovados.
- Nove testes novos do jogo: aprovados, incluindo gols, bola, erro, divisão, decimal, compatibilidade, desbloqueio e preservação de recordes.
- Testes auxiliares de dados/autenticação: 32/32 aprovados.
- Suíte geral: 191/204 aprovados. Permanecem os mesmos 13 testes de template já incompatíveis com este projeto antes da troca de tema (auth, PWA e migrations). Não são apresentados como resolvidos.
- Build final: aprovado com DATABASE_URL removida do ambiente, sem migrações em banco externo.
- Prévia compilada: corrigido o empacotamento dos arquivos locais PGLite que antes impedia a inicialização.
- Checagens automáticas de desenvolvimento e build em 1280×800 e 390×844: HTTP 200, sem erros de página/console, sem estouro horizontal e sem divergência de conteúdo.
- Teste interativo em 1024×768: partida inteira, 15 acertos/5 gols, uma resposta errada, divisões e 31 ÷ 2 = 15,5; recorde, XP e próxima etapa confirmados na tela.
- Segunda partida inteira no build final em celular: 15 acertos, divisão 15 ÷ 2 = 7,5, três estrelas, nível 3, próximo estágio e progresso mantido após recarregar. Sem erros no console.
- Teste em celular: campo, resposta, teclado e botão Confirmar visíveis. Saída e retorno ao campeonato preservam o histórico anterior.
- Identidade de compartilhamento: verificação aprovada, sem avisos.

## Limites

As verificações descritas aqui são locais. O envio e o merge no GitHub são acompanhados pelo pull request e não comprovam publicação em produção. Login real, sincronização entre aparelhos e entrega de notificações externas não foram homologados nesta rodada. O painel de pais já existente não ganhou PIN: a troca de tema não deve ser confundida com uma implementação de controle parental.

Na revisão pré-merge, uma cópia isolada de origin/main (2292940) reproduziu os mesmos 13 testes com falha: 182/195 no baseline e 191/204 nesta versão. Os 78 testes direcionados de futebol, identidade visual e verificações de navegador passaram, assim como typecheck e lint dos arquivos de produto alterados. Não foram incluídas capturas temporárias nem alterações em .vercel/output.

O preview de desenvolvimento fica em http://127.0.0.1:8080/. Para recriar o build de teste, executar o build sem DATABASE_URL e depois iniciar a prévia. A compilação verificada foi guardada em outputs/nico-futebol/build-local no workspace pai; o diretório compilado que já era versionado foi preservado no estado anterior, sem misturar seus arquivos gerados ao diff de produto.

As capturas e o resumo desta rodada ficam em outputs/nico-futebol. A ficha visual original permanece em docs/nico-mascote-oficial.md.
