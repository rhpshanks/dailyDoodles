# Daily Doodle: design brief (Phase 0)

## Design read
For anyone wanting a calm two-minute coloring ritual each day: soft, unhurried, quietly playful, zero pressure.

## Concept spine
Artifact / collectible: every day adds one page to a growing keepsake coloring book. The site reads like a well-kept sketchbook: paper, ink, one blue crayon.

## Delivery tier
`editorial` (user picked Non-animated at intake). The Tier-1 centerpiece is the live click-to-fill doodle canvas itself: it answers the visitor's input directly (each click fills a region with sound and motion), which beats any passive loop. Micro-motion elsewhere only.

## Animation mode
Animation mode: non-animated — user picked Non-animated at intake

## Locked palette
- Ground: limestone paper `#F4F2EE`
- Surface: white `#FFFFFF`
- Ink: deep warm ink `#262219`
- Muted ink: `#847E72`
- Accent (the ONE UI accent): ultramarine `#3441C8`
Defense: ink on paper is the honest material of a coloring book; ultramarine is the lone crayon left on the desk, so the doodle's own colors stay the loudest thing on the page. Doodle fill palettes (per artwork, curated sets in the art engine) count as artwork, not UI.

## Locked type
- Display + UI: Outfit
- Mono (counters, day chip, points): IBM Plex Mono
No serif anywhere.

## Combinatorial pick (held across all boards)
- Theme paradigm: Pristine Light (paper, dark ink)
- Background character: tactile paper texture
- Typography character: clean geometric grotesk
- Hero architecture: massive artwork-first with restrained text (the canvas IS the hero visual)
- Section system: asymmetric premium flow
- Signature components: layered print stack (book shelf), vertical rhythm lines (steps), big mono points strip, off-grid editorial offsets
- Narrative spine motif: keepsake book pages, collected prints
- Second-read moment: one oversized mono numeral as structure (the doodle number) in the closing points section, placed once

## Section plan (5 sections, 4 distinct families, eyebrow budget 2: using 1)
1. Canvas hero: live doodle canvas slightly right, headline top-left, progress ring + mono day chip. Anchor: artwork-as-canvas, top-left lead. Family: image-first hero.
2. Three quiet steps: off-grid offset rows with spot illustrations, vertical rhythm lines. Anchor: off-grid offset. Family: editorial rows.
3. My coloring book: layered print stack of finished pages + boxed CTA block. Anchor: stacked center. Family: gallery shelf.
4. Points + Blank Book: oversized mono numeral, meter toward 100, locked print unlock. Anchor: bottom-left lead. Family: split metric block.
5. Footer strip: tiny wordmark, sound note, quiet links. Family: slim bar.
Mobile: every multi-column section stacks to one column; canvas stays first.

## Asset plan (Higgsfield kit)
- Logo scribble monogram "D" + background-removed cutout (nav, head kit)
- Paper texture plate (section grounds)
- Spot illustration set, 3 pieces, one ink-line style: tap a shape, page filling, printed pages
- OG card 1200x630 in brand language
- Launch cover + feed card set per app-cover.md
- Head kit: favicon SVG monogram + PNG sizes, theme-color, full social block
The daily doodles themselves come from the in-repo procedural art engine (deterministic per date): artwork, not kit.

## CTA inventory (bespoke chrome, no shared button style)
- "Download my book" (Book section): boxed block with page-flip hover, its own component
- "Print the Blank Book" (Points section): underlined inline link + arrow, locked state shows points left, its own component
- "Sound" toggle chip (canvas toolbar): pill chip with tiny wave mark, its own component
One label per intent, reused exactly.

## Copy rules for this build
Plain, warm, short. No em or en dashes anywhere. Headlines max 8 words. Working headline: "Today's doodle. One click at a time."
