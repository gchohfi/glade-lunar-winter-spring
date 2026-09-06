# Correção das 13 falhas herdadas do template

6 de setembro de 2026. Base: `d0d496f` (Vestiário do Nico).

## Causa confirmada

As 13 falhas foram reproduzidas antes da correção. Os testes genéricos liam o checkout real como se ainda fosse um template vazio. A implementação já tinha identidade visual, autenticação e migrações do Missão Tabuada; essas condições válidas contaminavam os cenários genéricos.

| Grupo | Falhas anteriores | Causa | Correção |
| --- | ---: | --- | --- |
| `grok-pwa-plugin` | 8 | Leitura implícita do título e imagens reais quando o teste esperava fallback/placeholder | Contexto de arquivos isolado, implementação real e asserções originais preservadas |
| `with-app-env` | 3 | Expectativa de configuração `auth=false` no próprio jogo e herança do ambiente do processo | Cópia exata do CLI em diretório temporário, configurações explícitas e variável de ambiente controlada |
| `check-auth-invariant` | 1 | Expectativa de login desligado no jogo | Cenários separados para login ligado, desligado e configuração ausente |
| `migration-plan` | 1 | Expectativa de nenhuma migração ativa | Cenário de template isolado e verificação adicional das migrações reais do jogo |

O código de execução, autenticação, banco, imagens, regras e estado dos jogadores não foram modificados. Nenhum teste foi ignorado ou removido. O auxiliar de fixtures limpa somente os diretórios temporários que ele mesmo criou.

## Proteções acrescentadas

Sete novos testes verificam configuração ausente/ativa, preservação do login do jogo, ordem e não repetição das migrações, ausência de mistura entre identidades de projetos e título/imagens oficiais no snapshot de publicação. A checagem da cópia do esquema de autenticação agora também falha se a cópia obrigatória estiver ausente, em vez de retornar silenciosamente.

## Resultados executados

- `npm test`: **270 aprovados, zero falhas, zero ignorados** — 238 testes de scripts e 32 testes de dados/identidade. A segunda etapa, antes interrompida pelas falhas da primeira, também foi executada.
- Quatro grupos afetados: 84/84 aprovados. Repetidos fora da pasta do repositório, com `VITE_AUTH_ENABLED=false` e um hostname público diferente: 84/84 aprovados.
- Typecheck e lint dos cinco arquivos de testes/suporte alterados: aprovados.
- Build sem conexão a banco externo: aprovado.
- Comparação de autenticação entre desenvolvimento e build: login ligado em ambos, sem divergência.
- Smoke em desenvolvimento e build em 1280×800 e 390×844: conteúdo visível, sem overflow horizontal, erros de página/console ou alertas de marca/autenticação; sem divergência material entre versões.

Relatórios e imagens locais: `screenshots/test-suite-*`. O build gerado fica preservado fora do diff. Não houve validação de login real, sincronização entre aparelhos ou produção nesta correção de testes.
