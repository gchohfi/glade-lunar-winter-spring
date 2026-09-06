# Assets do Vestiário do Nico

## Entrega desta rodada

| Arquivo | Dimensões | Formato | Tamanho | Uso |
| --- | --- | --- | --- | --- |
| `public/game/football/ball-treino.webp` | 384 × 384 | RGBA WebP | 28.398 bytes | Bola marfim e verde-petróleo |
| `public/game/football/pitch-sunset.webp` | 1380 × 460 (3:1) | RGB WebP | 176.946 bytes | Variação de iluminação de fim de tarde |

A bola Craque azul/prata **não foi entregue nem adicionada ao catálogo por este trabalho de assets**. Quatro saídas do gerador mantiveram um xadrez opaco no fundo, sem alpha real. O item deve ficar fora da primeira coleção, sem imagem substituta e sem afirmar que está pronto.

O Nico, seu uniforme do Corinthians e todos os assets anteriores permaneceram inalterados. Esta entrega modifica somente as imagens consumíveis; critérios de desbloqueio, persistência e interfaces pertencem à implementação principal.

## Modo, fontes e processamento

Modo utilizado: ferramenta integrada `imagegen`, em edição com `referenced_image_paths`; sem CLI/API alternativo. As duas fontes foram abertas e inspecionadas antes dos pedidos.

- Fonte da bola: `public/game/football/ball-v2.webp`.
- Fonte do campo: `public/game/football/pitch-v2.webp`.
- PNG aprovado da bola Treino: `/Users/gabriela/.codex/generated_images/01a076e4-1e63-7071-8e78-c82389a202e9/exec-74a7e46d-8888-4b34-b186-15fff5f0b476.png` (1254², alpha real).
- PNG aprovado do campo: `/Users/gabriela/.codex/generated_images/01a076e4-1e63-7071-8e78-c82389a202e9/exec-0907b769-db89-4901-9a63-29ccc70bae1c.png` (2172 × 724).

Conversão mecânica via Sharp: redimensionamento e codificação WebP. Bola: qualidade 88, alphaQuality 100; campo: qualidade 82. Não houve recoloração manual, recorte por máscara, remoção de fundo por código ou edição por Python. Os PNGs originais do gerador foram preservados.

## Verificação

As versões finais foram abertas e inspecionadas, e a bola padrão foi comparada com a Treino em 48 × 48 px. O verde-petróleo continua distinguível do preto nesse tamanho. A silhueta e as costuras mantêm a mesma orientação geral.

| Medida, em 384 × 384 | Bola padrão | Bola Treino |
| --- | --- | --- |
| Pixels totalmente transparentes | 47.292 | 45.976 |
| Pixels totalmente opacos | 729 | 707 |
| Pixels com alpha parcial | 99.435 | 100.773 |
| Alpha no centro | 253 | 253 |
| Alpha nos quatro cantos | 0, 0, 0, 0 | 0, 0, 0, 0 |
| Caixa da silhueta com alpha > 127 | (16,13)–(367,370) | (15,12)–(368,371) |

A maior parte do interior tem alpha 252–253, como na fonte; foi preservada essa quase opacidade produzida pelo gerador. Há transparência verdadeira, não fundo xadrez embutido. A diferença de caixa é aproximadamente 1 pixel por borda, não igualdade pixel a pixel. Pequenas irregularidades antialiased na borda foram preservadas da geração; não há sombra de chão embutida.

O campo final mantém proporção 3:1, gol e arquibancadas à direita nas mesmas regiões gerais, iluminação quente à esquerda e gramado verde legível. Há pequena deriva de geometria do gerador, aproximadamente 1–2%: o poste frontal esquerdo aparece por volta de x70% e o direito por volta de x88%. O ponto de chegada x78%, y65% permanece na rede, próximo à base. Manter a imagem em 3:1 e validar a bola em execução; não esticar nem prometer coincidência pixel a pixel. O céu e as sombras mudaram como solicitado, sem personagens, bolas, textos ou logos novos.

A primeira edição do campo foi rejeitada por sair em 1898 × 829, alterando a proporção. A segunda saiu corretamente em 2172 × 724 e foi a usada.

## Prompts utilizados

### Bola Treino — aprovada

Use case: precise-object-edit. The provided image is the EDIT TARGET, not loose inspiration. Create the training reward skin of this exact football game sprite. Change ONLY the black pentagonal leather panels to a clearly recognizable rich dark petrol teal green (around #17666B), keeping warm ivory hexagonal panels. Preserve the exact ball shape, panel and seam layout, rotation, scale within the square canvas, transparent margins, center, upper-left light, fine leather texture, soft self-shading, and polished stylized-3D quality. The teal must read as colored teal rather than black even when displayed at 48px. Same single spherical football, no other objects. Return a genuinely transparent alpha background, retain antialiased edges, no ground or cast shadow, no opaque white or checkerboard backdrop. No text, logo, numbers, stars, or watermarks. Square image. Do not redesign the shape or zoom/reframe the ball.

### Campo — primeira tentativa rejeitada pela proporção

Use case: lighting-weather. The attached panoramic stadium image is the EDIT TARGET. Change ONLY sky color and illumination to a gentle warm late afternoon just before sunset, a welcoming golden-hour practice session. Preserve IDENTICAL composition, 3:1 aspect ratio, camera, framing, goal size and exact coordinates, white goalposts/net shapes, field lines, stands, vegetation and every object's geometry. Keep the goal opening between approximately 69–87% image width, 38–67% image height, so a runtime ball aimed at x78%,y65% still reaches the same net. Keep grass naturally green and clearly legible, not orange or brown; bright enough for a children's game. Soften the pale blue sky with restrained warm peach clouds and creamy sunlight from upper left; warm highlights, subtle longer soft shadows consistent with existing light direction, not dramatic night and not excessive orange wash. Do not move/crop/redraw the stadium architecture, goal, lines, trees or foreground. Do not add sun disk, players, mascot, ball, lights, equipment, ads, text, logos, banners, watermark or UI. Output the same panoramic 3:1 composition.

### Campo — edição aprovada

Use case: lighting-weather. EDIT this exact provided panorama. Output a ULTRA-WIDE 3:1 image, 2172 pixels wide by 724 pixels high if possible. Do not expand the image vertically. The original image should retain all scene geometry pixel-for-pixel after scaling. Apply only gentle late-afternoon golden sunlight from the same upper-left direction and warm creamy peach tones to the clouds; retain some pale blue sky, natural green grass, readable highlights and shadows. The warm effect is subtle and premium, not an all-over orange filter. INVARIANTS: exact same 3:1 frame, same camera and crop, same goal and posts/net with front corners x69%,y42% and x87%,y38%, goal base at y65%, same stands, same trees, field markings and foreground. No additional ground area; no zoom, pan, reposition, new objects, characters, ball, text or logos. This is a recolor and illumination edit only. The white goal, field lines, stadium contours must stay in the same normalized positions. Three times as wide as tall.

### Bola Craque — não entregue, falta de alpha real

Primeiro pedido (fonte `ball-v2.webp`):

Use case: precise-object-edit. The provided image is the EDIT TARGET. Create a professional champion reward skin of this exact football game sprite: preserve the exact sphere silhouette, position, scale, orientation, inflation, panel topology, stitch seams, leather microtexture and soft upper-left lighting. Keep ivory hexagonal leather panels; turn pentagonal panels deep navy blue with distinctive broad geometric insets in pale ice blue and subtle brushed silver, printed flush onto panels, not protruding. The pale blue and silver geometric motif should occupy much of each navy panel to clearly distinguish this reward at 48px; refined sports design, not neon and not shiny chrome. Do not change spherical outline, seams, viewpoint or framing; keep the same centered ball size and even transparent margins. One ball only, genuine transparent alpha backdrop with preserved antialiased edges. No floor, grass, cast shadow, white background or baked checkerboard. No gold, no stars, no words, numbers, brand logos or watermark.

Tentativa de extração do fundo (fonte: primeira saída Craque):

Use case: background-extraction. Image 1 is the exact EDIT TARGET. Preserve this same navy, pale ice-blue and ivory football completely unchanged, including all leather geometry, printed patterns, position, square framing, size and lighting. Remove ONLY the checkerboard background. Produce a real RGBA transparent PNG cutout with alpha exactly zero outside the sphere and opaque subject interior with antialiased contour. There must be NO checkerboard pixels, white backdrop, colored backdrop, ground or shadow. Do not simulate transparency; return actual alpha channel. No other edits.

Nova edição a partir da fonte aprovada `ball-v2.webp`:

Edit this football PNG sprite while retaining its transparent alpha channel. Change only the printed leather colors: the black pentagons become midnight navy blue, with broad ice-blue and silver chevron insets printed on each pentagon. Ivory hexagons unchanged. One spherical ball, same orientation, seams, leather texture, size, lighting, exact silhouette and position. Professional soccer reward skin, clearly blue/silver at small scale. The subject must remain a standalone isolated transparent cutout with zero-opacity pixels outside the ball, not a rectangular product photo. Keep the original alpha mask. No ground, shadow outside the ball, text, logo, gold or stars. Actual transparent PNG.

Mudança de estratégia para a fonte Treino já transparente:

The reference is a transparent football sprite. Retain the exact original transparency and isolated spherical outline. Edit only the colored green panels: recolor them deep navy blue and print two large parallel V-shaped stripes across each navy panel, one pale ice blue and one silver. Ivory leather remains untouched. Preserve image framing, sphere, seams, texture, highlights, scale, and lighting. This is a transparent game sprite, not a product photo; output a transparent RGBA PNG. Add nothing around the ball.

As quatro saídas da Craque foram verificadas visualmente; as verificações de metadados confirmaram RGB sem alpha nas saídas rejeitadas. Nenhuma delas foi copiada para `public/`. Caminhos preservados para proveniência:

- `/Users/gabriela/.codex/generated_images/01a076e4-1e63-7071-8e78-c82389a202e9/exec-a5d5d8a5-0d41-4b6a-9263-bc6d7f29fc8a.png`
- `/Users/gabriela/.codex/generated_images/01a076e4-1e63-7071-8e78-c82389a202e9/exec-9ce6ce49-4a10-4d5c-b03d-89f1ef49347b.png`
- `/Users/gabriela/.codex/generated_images/01a076e4-1e63-7071-8e78-c82389a202e9/exec-a663e41a-3f25-42a0-a96f-b7b8f6418926.png`
- `/Users/gabriela/.codex/generated_images/01a076e4-1e63-7071-8e78-c82389a202e9/exec-18b52ddb-84da-411e-93a4-6f0a92d1cbf5.png`
