# Football visual assets v2

Created for the field-and-ball visual refresh of Missão Tabuada. The existing approved Nico lion artwork is unchanged.

## Delivery

| Asset                                | Dimensions       | Format    | Bytes  | Role                            |
| ------------------------------------ | ---------------- | --------- | ------ | ------------------------------- |
| `public/game/football/pitch-v2.webp` | 1380 × 460 (3:1) | RGB WebP  | 153154 | Static stadium background layer |
| `public/game/football/ball-v2.webp`  | 384 × 384        | RGBA WebP | 26690  | Independent football sprite     |

Built-in `imagegen` mode was used, not CLI/API fallback. Original generated PNGs are retained by the image tool. The project files are resized and WebP-encoded copies, using Sharp without repainting, compositing, background removal, or identity edits.

Original pitch: `/Users/gabriela/.codex/generated_images/01a076e4-1e63-7071-8e78-c82389a202e9/exec-26e6c2d4-e100-49ef-80ec-837c6036d315.png` (2172 × 724).
Original ball: `/Users/gabriela/.codex/generated_images/01a076e4-1e63-7071-8e78-c82389a202e9/exec-b0a39797-357b-40eb-9f24-7d0b24816c19.png` (1254 × 1254).

## Runtime composition contract

Keep the panorama's 3:1 coordinate plane intact. The ball and Nico are separate DOM layers; do not stretch the ball or bake those actors into the panorama. These are 2D rendered images, not interactive 3D models.

Approximate positions, measured visually on the delivered panorama:

- The goal's front opening spans x = 69–87%, y = 38–67%; target center approximately x = 78%, y = 53%.
- Goal ground contact is about y = 65%, with the right post slightly lower due to perspective.
- Nico has open foreground at x = 13%, with feet at approximately y = 84%.
- A coherent ball trajectory may start at x = 30%, y = 82% and end inside the goal at x = 78%, y = 60%. Shrinking the ball modestly as it moves right will help communicate depth.
- Ball opaque-ish silhouette bounding box at alpha > 127: x = 16–367, y = 13–370 on the 384² sprite. Its visual center is approximately (192, 192); CSS sizing includes the transparent margin.
- Add runtime ground-contact shadows separately so they follow actor movement. The ball has self-shading but no baked cast shadow.

## Verification and deviations

Both final WebPs were opened and inspected. The panorama has a full visible white goal and net on the right, a clear green foreground, cream/charcoal stands, and no actors, balls, text, UI, club advertising or visible watermark.

The image generator placed more sky and distant vegetation in the top portion (about 30%) than the initial requested 10%. The resulting field remains open and the goal geometry is clear; integration must follow the actual positions above, not the original requested 84%,58% target. This is an honest composition deviation, not a claim of exact prompt adherence.

The ball has a genuinely transparent background. Raw decoded alpha verification: 47,292 fully transparent pixels; all four corners alpha 0; 729 fully opaque pixels; 99,435 partial-alpha pixels. Most subject pixels are alpha 253 (86,074 pixels), followed by alpha 252 (9,416), with antialiased boundary values. Center alpha is 253, so the generator's near-opaque subject alpha was preserved, not silently replaced. There is no white/checkerboard background baked into the visible sprite. At runtime size the black/ivory panel pattern remains readable.

This is a single static ball sprite for transform-based travel, not a frame animation sheet or a physically simulated rolling ball. Score and gameplay remain owned by application state.

## Prompt: pitch

Use case: stylized-concept. Asset type: polished panoramic 2D background image for a children's football math game, matching the softly realistic stylized-3D game-art feel of a warm golden lion mascot. Render a very wide 3:1 landscape, ideally 1536x512. A welcoming professional daytime training stadium, restrained natural forest and sage green grass, subtle mowing stripes, precise white field markings, cream and charcoal spectator seats across the rear upper quarter, pale blue sky only in the uppermost tenth. Camera is slightly elevated at the sideline, looking diagonally across a broad empty foreground to a clearly visible white football net goal at the RIGHT. Full goal, uncut, centered around 84% of image width and 58% of image height; goal opening faces the left foreground so a ball could be kicked toward it. Goal sits on the grass with believable posts, fine taut net and shadow. Left foreground around 13% width and 80% height is open short grass to composite a standing mascot later. Broad open grass path from x=30%,y=76% toward x=84%,y=68%. Ground is the dominant lower two thirds. Soft warm upper-left sunshine, realistic contact shadows and clean material detail, bright but balanced contrast, premium family-friendly 3D animated feature environment, not flat vector. No people, no animals, no mascots, no footballs, no equipment, no text, no ads, no logos, no banners, no watermark, no UI or scoreboard; no exaggerated fisheye or steep bird's-eye. It is a background layer, not a poster.

## Prompt: ball

Use case: stylized-concept. Asset type: one standalone football game sprite, square 1024x1024 image with genuine transparent alpha background. A single classic association football soccer ball, black pentagonal panels and warm ivory hexagonal panels, geometrically accurate stitched inflated sphere, premium softly realistic stylized-3D render compatible with a family-friendly 3D lion mascot. Three-quarter material lighting from upper left, fine leather grain and delicate recessed seams, clean readable panel contrast, subtle self-shading only. Center the sphere, tightly frame at 90% of canvas width with complete circular silhouette and small even transparent margins. No ground, no cast shadow outside sphere, no floor, no grass, no color backdrop, no white background, no checkerboard baked in, no border, no logo, no letters, no text, no numbers, no watermark, no other objects. Output actual transparent background, preserving antialiased alpha edges; do not simulate transparency.
