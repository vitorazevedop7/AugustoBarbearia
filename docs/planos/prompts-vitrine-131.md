# Prompts das fotos — #131

Fotos fictícias da D14, geradas em 2026-11-02 com o `imagegen` integrado (modo built-in), em uma chamada independente por arquivo, sem CLI. As referências de estilo inspecionadas foram `hero.jpg` e `sobre.jpg` do próprio repositório. Nenhuma imagem do Beard X foi usada, nem como referência de geração.

As cinco saídas foram revisadas individualmente antes e depois do processamento: ausência de rostos identificáveis, anatomia plausível das mãos, objetos coerentes, nenhum texto, logotipo, rótulo legível ou gravação em metal, e paleta quente de madeira escura, creme e detalhe carmesim. Todas passaram na primeira geração. Não retratam a Augusto Barbearia nem os proprietários e serão substituídas na P10.

## Arquivos finais e validação

Todos estão em `web/public/images/vitrine/`, em JPEG progressivo, espaço sRGB e sem EXIF. Os originais de geração foram preservados fora do repositório.

| ID | Arquivo | Dimensões finais | Bytes | Qualidade JPEG | Revisão |
|---|---|---|---:|---:|---|
| F1 | mosaico-1.jpg | 1200×1200 | 180.139 | 80 | Lavagem vista por trás, sem rosto; mãos e ducha coerentes. |
| F2 | mosaico-2.jpg | 1200×1200 | 169.900 | 80 | Pós-barba nas mãos, dedos naturais; frasco liso sem rótulo. |
| F3 | mosaico-3.jpg | 1200×1200 | 166.535 | 80 | Nuca com cabelo penteado; nenhum rosto ou texto. |
| F4 | mosaico-4.jpg | 1200×1200 | 188.700 | 70 | Cadeira preta e cromada sem inscrições; nenhum reflexo de pessoa. |
| F5 | mosaico-destaque.jpg | 1600×1600 | 242.752 | 80 | Corte social visto por trás e de lado; olhos, nariz e boca fora do quadro. |

O gerador entregou os cinco originais em 1254×1254, embora os prompts pedissem 2048×2048. Os quatro menores foram reduzidos para 1200×1200; o destaque foi redimensionado para 1600×1600 por interpolação Lanczos3 do Sharp. As dimensões finais atendem ao contrato dos arquivos. O destaque permanece nítido no tamanho de exibição previsto (até aproximadamente 656px CSS).

O processamento aplicou `resize(largura, altura, { fit: "cover", position: "centre" })`, `toColourspace("srgb")` e `jpeg({ quality, progressive: true, chromaSubsampling: "4:2:0" })`, sem preservar metadados. A qualidade começou em 80 e só foi reduzida na foto da cadeira para manter o limite de 200 KB. Metadados e peso foram conferidos com Sharp; nenhuma imagem ultrapassa seu limite (200 KB nas quatro menores; 300 KB no destaque).

## Prompts finais

### F1 — mosaico-1.jpg

```text
Use case: photorealistic-natural.
Asset type: square editorial website photograph, a fictional placeholder for a traditional barbershop photo mosaic. Create one single natural photograph, not a collage or graphic.
STYLE: photorealistic editorial photo of a classic, sober traditional barbershop interior,
warm tungsten light, dark stained wood cabinetry, cream plaster walls, black leather and
chrome barber chairs, small potted plants, soft background bokeh, subtle deep crimson
accent (#c41e3a) in a single fabric detail (towel, apron strap or cape trim), natural
skin and hand anatomy, shot on 35mm, shallow depth of field, consistent with the
reference photos hero.jpg and sobre.jpg.
NEGATIVE: no identifiable faces (crop above the mouth, show from behind, or cover with
towel), no text, no letters, no logos, no readable labels on bottles, no watermarks, no
extra fingers, no distorted tools, no stock-photo smile, no neon, no modern minimalist
white salon.
Additional constraints: no portraits or faces in reflections, wall art or background. No visible tool engravings, no packaging typography, no signs. All surfaces of objects are completely unbranded and plain. The main subject is inside the central 60% of the frame. This is a fictional barbershop scene, not a real business or its owners. Output a square 2048x2048 photo.
Primary request: Rear view of a seated male client having his short dark hair rinsed in a plain black salon washbasin. The camera is positioned behind and slightly above his head, seeing only the back of his head and the back of his neck, with his face completely outside the frame, no mirror. A barber's two anatomically natural hands gently rinse his hair with a plain chrome handheld shower, realistic water and wet strands. The black cape has one deep crimson trim. Warm dark wooden cabinetry and cream wall softly blurred behind. Keep the hands easy to read, each hand with five normal fingers, no fused digits.
```

### F2 — mosaico-2.jpg

```text
Use case: photorealistic-natural.
Asset type: square editorial website photograph, a fictional placeholder for a traditional barbershop photo mosaic. Create one single natural photograph, not a collage or graphic.
STYLE: photorealistic editorial photo of a classic, sober traditional barbershop interior,
warm tungsten light, dark stained wood cabinetry, cream plaster walls, black leather and
chrome barber chairs, small potted plants, soft background bokeh, subtle deep crimson
accent (#c41e3a) in a single fabric detail (towel, apron strap or cape trim), natural
skin and hand anatomy, shot on 35mm, shallow depth of field, consistent with the
reference photos hero.jpg and sobre.jpg.
NEGATIVE: no identifiable faces (crop above the mouth, show from behind, or cover with
towel), no text, no letters, no logos, no readable labels on bottles, no watermarks, no
extra fingers, no distorted tools, no stock-photo smile, no neon, no modern minimalist
white salon.
Additional constraints: no portraits or faces in reflections, wall art or background. No visible tool engravings, no packaging typography, no signs. All surfaces of objects are completely unbranded and plain. The main subject is inside the central 60% of the frame. This is a fictional barbershop scene, not a real business or its owners. Output a square 2048x2048 photo.
Primary request: Close editorial detail of a barber dispensing a small amount of clear aftershave balm from a plain amber bottle into the open palm of his other hand over a dark wooden counter. Only two hands and the wrists are visible, no face or body or client. Show the receiving hand relaxed and open with exactly five anatomically natural fingers, and the second hand naturally holding the small fully blank bottle; no label or engraving anywhere. A folded deep crimson towel is a subtle fabric detail; a black leather chair softly blurred behind. Focus on the hands and the small pool of balm, realistic skin texture.
```

### F3 — mosaico-3.jpg

```text
Use case: photorealistic-natural.
Asset type: square editorial website photograph, a fictional placeholder for a traditional barbershop photo mosaic. Create one single natural photograph, not a collage or graphic.
STYLE: photorealistic editorial photo of a classic, sober traditional barbershop interior,
warm tungsten light, dark stained wood cabinetry, cream plaster walls, black leather and
chrome barber chairs, small potted plants, soft background bokeh, subtle deep crimson
accent (#c41e3a) in a single fabric detail (towel, apron strap or cape trim), natural
skin and hand anatomy, shot on 35mm, shallow depth of field, consistent with the
reference photos hero.jpg and sobre.jpg.
NEGATIVE: no identifiable faces (crop above the mouth, show from behind, or cover with
towel), no text, no letters, no logos, no readable labels on bottles, no watermarks, no
extra fingers, no distorted tools, no stock-photo smile, no neon, no modern minimalist
white salon.
Additional constraints: no portraits or faces in reflections, wall art or background. No visible tool engravings, no packaging typography, no signs. All surfaces of objects are completely unbranded and plain. The main subject is inside the central 60% of the frame. This is a fictional barbershop scene, not a real business or its owners. Output a square 2048x2048 photo.
Primary request: Close view from directly behind of freshly combed short dark hair styled with pomade, with a clean natural tapered neckline and neatly laid strands catching warm light. Only the back of a male client's head, ears and neck are visible; his face is completely outside the frame. No hands, no tools, no bottles. Black barber cape with a subtle deep crimson edge at the shoulders. Dark stained wood and a softly blurred cream wall in the background, with no pictures, portraits, signs or mirrors. Natural believable haircut, not overly glossy.
```

### F4 — mosaico-4.jpg

```text
Use case: photorealistic-natural.
Asset type: square editorial website photograph, a fictional placeholder for a traditional barbershop photo mosaic. Create one single natural photograph, not a collage or graphic.
STYLE: photorealistic editorial photo of a classic, sober traditional barbershop interior,
warm tungsten light, dark stained wood cabinetry, cream plaster walls, black leather and
chrome barber chairs, small potted plants, soft background bokeh, subtle deep crimson
accent (#c41e3a) in a single fabric detail (towel, apron strap or cape trim), natural
skin and hand anatomy, shot on 35mm, shallow depth of field, consistent with the
reference photos hero.jpg and sobre.jpg.
NEGATIVE: no identifiable faces (crop above the mouth, show from behind, or cover with
towel), no text, no letters, no logos, no readable labels on bottles, no watermarks, no
extra fingers, no distorted tools, no stock-photo smile, no neon, no modern minimalist
white salon.
Additional constraints: no portraits or faces in reflections, wall art or background. No visible tool engravings, no packaging typography, no signs. All surfaces of objects are completely unbranded and plain. The main subject is inside the central 60% of the frame. This is a fictional barbershop scene, not a real business or its owners. Output a square 2048x2048 photo.
Primary request: Detailed editorial photograph of a vintage black leather barber chair: polished chrome armrest, chrome hydraulic pedestal and textured black leather upholstery. Crop into the chair so these materials dominate the square composition. No people, no hands, no hair or faces. A small folded deep crimson towel rests on the back edge of the chair; dark wooden floor and cabinetry with a cream wall softly out of focus. The chrome surfaces reflect abstract warm light only, no people, lettering, numbers or engraved maker marks. Realistic metal, carefully controlled highlights.
```

### F5 — mosaico-destaque.jpg

```text
Use case: photorealistic-natural.
Asset type: square editorial website photograph, a fictional placeholder for a traditional barbershop photo mosaic. Create one single natural photograph, not a collage or graphic.
STYLE: photorealistic editorial photo of a classic, sober traditional barbershop interior,
warm tungsten light, dark stained wood cabinetry, cream plaster walls, black leather and
chrome barber chairs, small potted plants, soft background bokeh, subtle deep crimson
accent (#c41e3a) in a single fabric detail (towel, apron strap or cape trim), natural
skin and hand anatomy, shot on 35mm, shallow depth of field, consistent with the
reference photos hero.jpg and sobre.jpg.
NEGATIVE: no identifiable faces (crop above the mouth, show from behind, or cover with
towel), no text, no letters, no logos, no readable labels on bottles, no watermarks, no
extra fingers, no distorted tools, no stock-photo smile, no neon, no modern minimalist
white salon.
Additional constraints: no portraits or faces in reflections, wall art or background. No visible tool engravings, no packaging typography, no signs. All surfaces of objects are completely unbranded and plain. The main subject is inside the central 60% of the frame. This is a fictional barbershop scene, not a real business or its owners. Output a square 2048x2048 photo.
Primary request: Finished classic side-part haircut on short dark brown hair, viewed from a three-quarter rear-side angle. The head is turned away; compose so only the back and side of the hairstyle, one ear and the nape are visible. The face is completely outside the frame, not merely blurred, no eyes or nose or mouth. No hands or tools. Black barber cape with one subtle deep crimson trim and natural shoulders. Beautifully combed side-part hairstyle with understated pomade sheen, clean tapered sides, warm tungsten light showing real individual hair strands. Dark wooden cabinetry, cream plaster and a black leather chair softly blurred behind; no mirror or wall art. Premium but candid editorial barbershop photography.
```
