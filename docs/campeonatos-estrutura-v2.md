# Missão Tabuada — campeonatos conectados, estrutura v2

Data: 8 de setembro de 2026.

Esta versão substitui `campeonatos-estrutura-v1.md` como contrato da implementação em andamento. A mudança aprovada é **quatro campeonatos de cinco partidas**, com conta do responsável e progresso confirmado pelo servidor. A primeira partida tem **15 acertos, cinco gols e três minutos para responder**. Este documento descreve decisões e comportamento esperado; não equivale a publicação, teste com a criança ou comprovação de domínio pedagógico.

## 1. Uma hierarquia, um próximo passo

**Campeonato → partidas → contas.**

“Missão Tabuada” é o nome do produto. Não há um segundo objetivo chamado missão diária, foco ou bônus para a criança administrar. O desafio de aprendizagem está dentro da partida. Nico permanece o leão aprovado, com camiseta branca e shorts pretos, integrado ao campo.

A Home contém um único bloco: campeonato atual, cinco posições, próxima partida, tema e botão de jogar. Uma partida em andamento sempre tem prioridade e oferece **Continuar partida**, com os acertos e gols já confirmados. “Campeonatos” e “Vestiário” são acessos secundários; “Pais” fica discreto no cabeçalho.

Saem do bloco principal: saldo, meta de compra, XP, categorias, honrarias, calendário, foco e prêmio familiar. Não são substituídos por outros cartões concorrentes.

Depois de jogar no dia, a Home pode dizer “Bom jogo hoje! Pode parar por aqui e voltar quando quiser.” O próximo jogo segue disponível, sem obrigação de jogar mais ou esperar o dia seguinte.

## 2. Quatro copas, vinte posições

Todas as copas têm a mesma ordem: **Abertura → Rodada 2 → Rodada 3 → Semifinal → Final**. Os nomes representam uma aventura pessoal; não há adversários reais, classificação pública ou eliminação contra outra criança.

| Campeonato       | Abertura              | Rodada 2              | Rodada 3             | Semifinal              | Final               |
| ---------------- | --------------------- | --------------------- | -------------------- | ---------------------- | ------------------- |
| Copa do Bairro   | Tabuada do 3          | Tabuada do 4          | Tabuada do 5         | Tabuada do 10          | Revisão do Bairro   |
| Copa da Cidade   | Tabuadas do 6 e do 7  | Tabuadas do 8 e do 9  | Tabuada do 11        | Tabuadas do 12 e do 13 | Revisão da Cidade   |
| Liga dos Craques | Dividir por 3 e por 4 | Dividir por 5 e por 6 | Dividir por 7, 8 e 9 | Metades com vírgula    | Revisão dos Craques |
| Copa do Nico     | Revisar 3, 4, 5 e 10  | Revisar 6, 7, 8 e 9   | Revisar 11, 12 e 13  | Revisar divisões       | Final personalizada |

As partidas novas retomam conteúdo já apresentado. A seleção adaptativa fica restrita ao conjunto elegível da partida: histórico avançado não coloca divisões na primeira copa. A final reúne o que veio antes; não introduz uma operação surpresa.

Concluir a partida abre a seguinte; a quinta abre a próxima copa. Compra, saldo, XP e calendário não desbloqueiam conteúdo. Vinte partidas são posições do percurso, não promessa de aprender tudo em vinte sessões.

Após concluir as quatro copas, a recomendação passa a ser **Revisão da Copa do Nico**. O mapa permanece concluído; não há reset de moedas, itens, troféus ou histórico. Rejogar partidas anteriores é opcional.

## 3. A partida

1. A tela apresenta uma conta e o teclado juntos.
2. Cada resposta correta avança a bola. Três acertos conquistam uma oportunidade de chute.
3. A criança escolhe esquerda, centro ou direita. **Todo chute preparado vira gol**: a escolha é participação no futebol, não outra prova para perder um acerto matemático.
4. Cinco gols, correspondentes a quinze acertos, concluem a partida após o último chute confirmado.
5. Erro oferece explicação e revisão posterior. Não retira gols nem conquistas anteriores. Uma resposta dada após ajuda não se transforma em evidência independente.

### Tempo e pausa

O padrão é **três minutos de resposta matemática**, configurável pelos pais para dois, três ou cinco minutos nas próximas partidas. O relógio não conta durante ajuda, feedback, chute ou pausa.

Nesta v2, terminar o tempo encerra aquela tentativa. “Tentar novamente” começa outra tentativa do zero; isso é diferente de pausar. **Sair e guardar** preserva a partida ativa para retomada, com suas contas, gols e tempo restante. Essa decisão substitui a proposta sem derrota por tempo da v1 e deve ser explicitada no playtest.

Na revisão com a criança, verificar se ela distingue “Pausar e continuar” de “Tempo encerrado e tentar novamente”. Não anunciar que os acertos daquela tentativa foram guardados se a tentativa já terminou.

## 4. Resultado e moedas

Uma única recompensa: **30 moedas na primeira partida concluída de cada dia**, em `America/Sao_Paulo`. Não há pagamento separado por foco, login, minutos jogados ou partidas extras.

O resultado informa conclusão, avanço e moedas realmente concedidas. Reabrir o resultado, atualizar a página ou repetir o comando não pode conceder novamente. O dia relevante é o da conclusão, inclusive quando a partida começou em outro dia.

Registros antigos de 10, 20 ou 30 moedas são preservados pelo valor real e impedem novo pagamento naquele dia. Não completar retroativamente uma concessão antiga para 30.

O Vestiário permanece fora do caminho obrigatório: prévia no campo, custo visível, confirmação de compra e equipar como ação separada. Sem dinheiro real, sorteio, ofertas com prazo ou vantagem matemática comprável. Preservam-se itens e moedas já conquistados. Os cosméticos gratuitos continuam reconhecendo tanto conquistas antigas quanto os marcos correspondentes do novo percurso: primeira partida do Bairro e final da Cidade.

## 5. Conta do responsável e continuidade

O adulto usa sua própria conta. Não se pede e-mail da criança. A tela de entrada mantém Google e X e passa a oferecer e-mail/senha pela autenticação real já existente. Não existem usuário simulado, perfil anônimo ou botão que contorne a conexão para iniciar o novo percurso.

O servidor confirma início, respostas, ajuda, pausa, chutes, conclusão, compras e preferências. A cópia no aparelho é apoio de recuperação, não autoridade para reescrever todo o progresso da conta.

Uma partida ativa tem um aparelho responsável por vez. Em outro aparelho, **Continuar aqui** assume explicitamente a partida, recuperando o progresso confirmado; alterações concorrentes não podem criar dois créditos ou dois avanços.

| Estado                          | Resposta da interface                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Carregando                      | “Buscando seu campeonato…”; não exibir saldo ou progresso fictício                                           |
| Sem conta                       | Nico no campo, contexto do jogo e uma ação: “Entrar com o responsável”                                       |
| Histórico antigo neste aparelho | Adulto confirma se pertence à conta antes da importação                                                      |
| Partida ativa                   | “Continuar partida”, sem escolher outro jogo silenciosamente                                                 |
| Em outro aparelho               | “Continuar aqui”, com transferência explícita                                                                |
| Sem rede ou confirmação         | Interromper a interação; “Reconectar e conferir progresso”                                                   |
| Conflito                        | Receber o estado confirmado e informar o que mudou; não repetir compras automaticamente como novas operações |
| Estado temporário               | Recusar gravação e importação; informar que nada foi confirmado na conta até existir banco persistente        |

A importação conserva histórico, moedas e itens antigos, mas **não declara concluídas as novas aulas de cinco partidas** com base nas antigas estrelas. O percurso novo começa na Copa do Bairro; registros anteriores não são apagados nem apresentados como aprendizagem do conteúdo novo.

## 6. Espaço dos pais

O painel reúne:

- Campeonato atual e número de partidas concluídas no percurso.
- Prática do dia, comparação semanal e contas que pedem apoio.
- Evidência de primeiras respostas certas em dias diferentes, separada de respostas assistidas.
- Preferências de nome, som, duração de dois/três/cinco minutos e combinado familiar.
- Registro de prêmio entregue, sem transformar esse prêmio em condição para avançar.

Preferências são editadas num formulário e enviadas com **Salvar preferências**. A interface só confirma salvamento depois da resposta do servidor. O seletor antigo de categoria, XP e “segundos extras” deixa de comandar a progressão.

Troféu significa conclusão de copa. Velocidade, moedas e respostas copiadas não são evidência suficiente de domínio. O painel não promete diagnóstico de aprendizagem.

## 7. Interface e critérios de verificação

Usar o design system e o Nico existentes. As novas regras de layout ficam em classes `course-*`; não alterar os estilos antigos para simular o novo percurso.

- Home: um bloco de campeonato e uma ação principal, com Nico dentro do mesmo campo.
- Campeonatos: quatro copas; apenas uma expandida por vez. Cada partida tem estado textual e bloqueio explicado, não só um cadeado.
- Jogo: conta, resposta e teclado visíveis juntos. A arte diminui antes dos controles em telas menores.
- Alvos de toque de pelo menos 44 px; foco visível; botões reais; textos sem truncar o objetivo; resultados anunciados sem repetir o cronômetro ao leitor de tela.
- Revisar 390 × 844, 834 × 1194 e 1440 × 1000. Movimento reduzido remove deslocamentos da bola, mantendo resultado e controles.
- Testar uma partida completa com quinze acertos e cinco escolhas de chute; erro/ajuda; saída/retomada; timeout; uma copa completa; recompensa única; compra/equipamento; troca de aparelho e reconexão.
- Validar progresso antigo sem perda, conta A isolada de conta B, comandos duplicados e revisão concorrente.
- Produção, persistência real e continuidade entre aparelhos exigem verificações próprias; um preview renderizando não prova esses resultados.

O teste final de compreensão é simples: a criança identifica a copa, encontra a próxima partida e começa sem explicação do adulto. O retorno voluntário e a lembrança das contas em dias posteriores precisam ser observados; não podem ser declarados apenas porque o código funciona.
