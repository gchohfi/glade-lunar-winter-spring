# Novos assets do clube — 2026-09-08

## Escopo e método

Variações para o Vestiário do Missão Tabuada, criadas com a ferramenta integrada `image_gen` em chamadas separadas, a partir dos arquivos aprovados `public/game/football/ball-v2.webp` e `public/game/football/pitch-v2.webp`. Referências abertas e inspecionadas antes da edição. Não houve uso de API/CLI de geração nem alteração do Nico.

Não alterados: todos os assets anteriores, `public/og.jpg`, `public/x-banner.jpg`, `public/favicon.svg` e `src/lib/og/site.json`. O check `node scripts/brand-check.mjs --game` retornou `ok: true`, `warnings: 0`; o título permanece Missão Tabuada e o tipo `x:game`.

## Arquivos aceitos

| Item | Arquivo público | Dimensões | Tamanho | Resultado |
| --- | --- | --- | --- | --- |
| Noite de jogo | `/game/football/club/field-night.webp` | 1380 × 460 | 206680 bytes | Aprovado para integração |
| Campo esmeralda | `/game/football/club/field-emerald.webp` | 1380 × 460 | 224538 bytes | Aprovado para integração |
| Bola dourada | `/game/football/club/ball-gold.webp` | 384 × 384 | 41688 bytes | RGB; requer máscara circular em todo consumidor |
| Bola gelo | `/game/football/club/ball-ice.webp` | 384 × 384 | 38712 bytes | RGB; requer máscara circular em todo consumidor |

Os campos foram gerados em 2172 × 724 (3:1), redimensionados sem corte para 1380 × 460 e codificados WebP quality 90. O processamento local foi exclusivamente exportação/redimensionamento, sem redesenho ou recoloração.

Inspeção dos arquivos finais: campo e linhas legíveis, mesmo enquadramento, gol à direita nas mesmas posições relativas, nenhum personagem, bola, texto ou interface na imagem. Noite de jogo tem céu azul-violeta e refletores, mantendo gramado claro. Campo esmeralda tem vegetação fresca e faixas de corte verdes. A geometria foi conferida visualmente; o encaixe da animação de gol deve ser retestado no jogo, não inferido apenas pela imagem.

## Contrato obrigatório de apresentação — bolas RGB

A bola dourada e a bola prata/azul foram geradas em RGB com fundo quadriculado pintado, não transparência real. Houve uma segunda tentativa focada apenas na extração do fundo para cada bola; ambas continuaram RGB. Verificação de modo e canais executada com Pillow: `NO ALPHA` nos quatro arquivos.

Após inspeção pelo agente principal, foi aprovado um fallback de **apresentação**, sem remoção de fundo ou edição de pixels: publicar as duas primeiras gerações em WebP RGB, apenas redimensionadas proporcionalmente de 1254 × 1254 para 384 × 384 (quality 92), e aplicar `clip-path: circle(44.5% at 50% 50%)` em **todos** os consumidores. A máscara conservadora recorta dentro da silhueta da bola para que o quadriculado externo não apareça. Ela não cria alfa no arquivo, nem preserva toda a borda original do objeto.

Os arquivos das bolas **não são sprites transparentes autônomos** e não devem ser usados em `<img>` sem essa máscara. Catálogo, preview, Home, partida, treino, próxima conquista e resultado precisam usar a mesma apresentação. O agente principal/interface é responsável pela aplicação da máscara e QA visual nos tamanhos reais; não basta verificar o arquivo bruto. Não foi aplicado filtro CSS de recoloração: cada bola tem arte própria gerada.

Defeito remanescente conhecido: os arquivos brutos e os WebPs das bolas continuam contendo quadriculado pintado fora do objeto. Caso a máscara não seja adequada a um novo consumidor, ele deve usar um sprite com alfa real ou aguardar extração autorizada, não anunciar transparência inexistente.

Tentativas focadas, não aprovadas:

- Dourada: `/Users/gabriela/.codex/generated_images/01a08154-01c6-72c1-9ca0-ab06a7f80772/exec-1f9a6802-4fdb-484a-8b90-5a3d55040bc3.png`.
- Prata/azul: `/Users/gabriela/.codex/generated_images/01a08154-01c6-72c1-9ca0-ab06a7f80772/exec-49f31194-0757-4ec9-9d08-fdff414bd46d.png`.

## Prompts completos e proveniência

### ball-gold

Entrada: `/Users/gabriela/Documents/Codex/2026-09-04/pu/work/glade-lunar-winter-spring/public/game/football/ball-v2.webp`.

Saída bruta: `/Users/gabriela/.codex/generated_images/01a08154-01c6-72c1-9ca0-ab06a7f80772/exec-a784aefc-1a11-41ad-a73a-361702af7fe7.png`.

```text
Use case: precise-object-edit. Asset type: an isolated football sprite for an educational football game. Edit ONLY the surface colors/material of the exact football in the reference: make the ivory panels lustrous satin champagne gold and the black pentagons rich charcoal, with fine gold seams and premium stitched leather detail. Keep the exact original spherical silhouette, panel layout, orientation, scale, framing and soft light from the upper left. One whole ball only, centered in the same square canvas and nearly filling it with a slim margin. Actual transparent alpha background; nothing behind it, no ground, no shadow cast outside the ball, no white matte, no checkerboard pixels. High-quality stylized 3D product render, believable football rather than a metallic ornament. No writing, letters, logos, numbers, sparkles or additional objects. The gold has to read distinctly at small icon size.
```

### ball-ice

Entrada: `/Users/gabriela/Documents/Codex/2026-09-04/pu/work/glade-lunar-winter-spring/public/game/football/ball-v2.webp`.

Saída bruta: `/Users/gabriela/.codex/generated_images/01a08154-01c6-72c1-9ca0-ab06a7f80772/exec-957302bb-821c-4219-b5cc-50fb5b572be0.png`.

```text
Use case: precise-object-edit. Asset type: isolated football sprite for an educational football game. Edit ONLY the surface colors/material of the exact football in the reference: make the ivory panels a luminous pearl-silver matte leather and the black pentagons saturated arctic blue with slim icy blue seam details. Keep the exact original spherical silhouette, panel layout, orientation, scale, framing and soft light from upper left. One whole ball only, centered in the same square canvas and nearly filling it with a slim margin. Actual transparent alpha background; nothing behind it, no ground, no shadow cast outside the ball, no white matte, no checkerboard pixels. High-quality stylized 3D premium sports collectible, not literally made from ice. No writing, letters, logos, numbers, crystalline shards, sparkles or additional objects. Distinct crisp blue and silver palette that reads at small icon size.
```

### field-night

Entrada: `/Users/gabriela/Documents/Codex/2026-09-04/pu/work/glade-lunar-winter-spring/public/game/football/pitch-v2.webp`.

Saída bruta: `/Users/gabriela/.codex/generated_images/01a08154-01c6-72c1-9ca0-ab06a7f80772/exec-a02f08ee-570d-411c-8297-7f7393cd15f8.png`.

```text
Use case: lighting-weather. Asset type: precise background variant for a side-view football game. Edit the provided panoramic pitch image into a beautiful blue-hour stadium under warm-white floodlights. Change ONLY sky, time-of-day, illumination and color atmosphere; do not change or move the architecture, trees, grass linework, goalposts, net or any perspective geometry. The identical goal on the right and identical goal-mouth corners must remain in the same exact places, with the same size, projection, and net; the game overlays its ball at the middle lower part of this goal. Preserve the original ultra-wide 3:1 canvas with no cropping, enlargement, camera movement or reframing. Keep the foreground pitch bright and readable green under stadium lighting, blue-violet dusk sky, refined warm highlights on the stadium, realistic-stylized finish matching the reference. Add restrained lit floodlight structures only in the empty sky/upper roof area if needed, never in the pitch or goal. No people, no Nico, no footballs, no text, no banners with writing, no UI, no fireworks, no confetti. This is a usable clean gameplay background, not a poster.
```

### field-emerald

Entrada: `/Users/gabriela/Documents/Codex/2026-09-04/pu/work/glade-lunar-winter-spring/public/game/football/pitch-v2.webp`.

Saída bruta: `/Users/gabriela/.codex/generated_images/01a08154-01c6-72c1-9ca0-ab06a7f80772/exec-93ffbdf1-b608-4e22-9a94-5bd5f23c9a61.png`.

```text
Use case: lighting-weather. Asset type: precise background variant for a side-view football game. Edit the provided panoramic stadium into an exceptionally lush emerald-green training field on a clear fresh morning, with refined vibrant green alternating mowing stripes and brighter healthy foliage. Change ONLY turf appearance and colors, foliage freshness, sky and morning illumination; do not change or move architecture, grass linework, goalposts, net or any perspective geometry. The identical white goal on the right and its goal-mouth corners must remain in the same exact places, size, projection and net, so the game's shot animation continues landing in the net. Preserve the original ultra-wide 3:1 canvas with no cropping, enlargement, camera movement or reframing. Warm gentle sunlight from upper left, premium believable sports render matching the reference; the emerald turf is noticeably different yet natural. No people, no Nico, no footballs, no text, no cones, no additional equipment, no UI, no decorative objects. Clean empty playing surface ready for a separately rendered player and ball.
```


### Retry focado das bolas

Cada uma das imagens brutas acima foi usada como entrada individual:

```text
Use case: background-extraction. Remove the painted gray-and-white checkerboard background of this football and return a real transparent PNG cutout, using actual per-pixel alpha transparency. The checkerboard is an error in the source, not part of the object or a background to keep. Preserve the entire football exactly as shown: same gold/black or silver/blue panels, leather texture, stitches, light, silhouette, framing and size. Background outside the ball must have alpha zero, with smooth semitransparent antialiased edge pixels; it must not be replaced by white, gray, black, a checkerboard pattern or any other painted color. No cast shadow or ground plane. Only the exact source football and truly transparent empty pixels.
```
