"""Generate the Vinod Kumar brand assets in public/brand/ and public/.

Concept: "VK as a system graph". One continuous stroke draws the V and the K,
which share a vertex: the V's right arm *is* the top of the K's stem. Open
ends are nodes (services), and the K's junction is the glowing teal hub (the
backend in control). On the site the same geometry draws itself and a signal
pulse travels the path (src/components/Logo.jsx).

The wordmark is Geist converted to outlines, so the lockups render identically
without the font installed. Re-run after changing geometry or colours:

    python scripts/build-brand.py
"""
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "brand"
SANS = ROOT / "node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2"
MONO = ROOT / "node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2"

NAVY, PANEL, WHITE = "#0B1220", "#111D30", "#F5F7FA"
BLUE, TEAL = "#4D7CFE", "#48D6C5"
BLUE_DEEP, TEAL_DEEP = "#2F5BE0", "#0B7A6E"  # AA-contrast variants for light backgrounds

# ---- Geometry: 64-unit grid, glyph box 10..54 x 14..50 (centred) ----------
# Keep in sync with src/components/Logo.jsx.
STROKE = "M10 14 L22 50 L34 14 L34 50 M34 32 L54 14 M34 32 L54 50"
ENDS = [(10, 14), (34, 50), (54, 14), (54, 50)]
HUB = (34, 32)
WIDTH = 4.5

THEMES = {
    # (gradient start, gradient end, node ring, node fill, hub, background)
    "dark": (BLUE, TEAL, WHITE, NAVY, TEAL, NAVY),
    "light": (BLUE_DEEP, TEAL_DEEP, NAVY, WHITE, TEAL_DEEP, WHITE),
}


def mark(theme, uid, transform="", nodes=True, width=WIDTH):
    g0, g1, ring, node_fill, hub, _ = THEMES[theme]
    t = f' transform="{transform}"' if transform else ""
    defs = (
        f'<defs><linearGradient id="{uid}-g" x1="10" y1="14" x2="54" y2="50" gradientUnits="userSpaceOnUse">'
        f'<stop offset="0" stop-color="{g0}"/><stop offset="1" stop-color="{g1}"/></linearGradient>'
        f'<radialGradient id="{uid}-h"><stop offset="0" stop-color="{hub}" stop-opacity=".55"/>'
        f'<stop offset="1" stop-color="{hub}" stop-opacity="0"/></radialGradient></defs>'
    )
    body = (
        f'<circle cx="{HUB[0]}" cy="{HUB[1]}" r="11" fill="url(#{uid}-h)"/>'
        f'<path d="{STROKE}" fill="none" stroke="url(#{uid}-g)" stroke-width="{width}" '
        f'stroke-linecap="round" stroke-linejoin="round"/>'
    )
    if nodes:
        body += "".join(
            f'<circle cx="{x}" cy="{y}" r="3.4" fill="{node_fill}" stroke="{ring}" stroke-width="1.8"/>' for x, y in ENDS
        )
    body += f'<circle cx="{HUB[0]}" cy="{HUB[1]}" r="4.6" fill="{hub}"/>'
    body += f'<circle cx="{HUB[0]}" cy="{HUB[1]}" r="1.8" fill="{node_fill}"/>'
    return defs + f"<g{t}>{body}</g>"


def svg(w, h, body, title, px=None):
    pw, ph = (px, px) if px else (w, h)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}" width="{pw:g}" height="{ph:g}" '
        f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'
    )


def outline(text, font_path, size, weight, tracking=0.0):
    font = instantiateVariableFont(TTFont(font_path), {"wght": weight})
    scale = size / font["head"].unitsPerEm
    cmap, gs, hmtx = font.getBestCmap(), font.getGlyphSet(), font["hmtx"]
    x, parts = 0.0, []
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, 0)))
        if pen.getCommands():
            parts.append(pen.getCommands())
        x += hmtx[name][0] * scale + tracking * size
    return " ".join(parts), x - tracking * size, font["OS/2"].sCapHeight * scale


def tile_body(uid, inset=0.86, nodes=True, width=WIDTH, radius=14):
    off = 32 * (1 - inset)
    return (
        f'<defs><linearGradient id="{uid}-b" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">'
        f'<stop offset="0" stop-color="{BLUE}" stop-opacity=".55"/><stop offset=".5" stop-color="#27354A"/>'
        f'<stop offset="1" stop-color="{TEAL}" stop-opacity=".45"/></linearGradient>'
        f'<radialGradient id="{uid}-bg" cx=".3" cy=".2" r=".9"><stop offset="0" stop-color="{PANEL}"/>'
        f'<stop offset="1" stop-color="{NAVY}"/></radialGradient></defs>'
        f'<rect width="64" height="64" rx="{radius}" fill="url(#{uid}-bg)"/>'
        f'<rect x=".75" y=".75" width="62.5" height="62.5" rx="{radius - 0.75}" fill="none" stroke="url(#{uid}-b)" stroke-width="1.5"/>'
        + mark("dark", uid, f"translate({off:.2f} {off:.2f}) scale({inset})", nodes=nodes, width=width)
    )


def lockup(theme):
    word_color = WHITE if theme == "dark" else NAVY
    sub_color = TEAL if theme == "dark" else TEAL_DEEP
    name_d, name_w, cap = outline("Vinod Kumar", SANS, 30, 620, -0.02)
    sub_d, sub_w, _ = outline("FULL STACK  ·  AI ENGINEER", MONO, 10.5, 500, 0.12)
    x = 64 + 14
    body = (
        mark(theme, f"lk-{theme}")
        + f'<path d="{name_d}" fill="{word_color}" transform="translate({x} 33)"/>'
        + f'<path d="{sub_d}" fill="{sub_color}" transform="translate({x + 1} 50)"/>'
    )
    return svg(round(x + max(name_w, sub_w) + 4, 2), 64, body, "Vinod Kumar")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    files = {
        OUT / "vk-mark-dark.svg": svg(64, 64, mark("dark", "md"), "VK"),
        OUT / "vk-mark-light.svg": svg(64, 64, mark("light", "ml"), "VK"),
        OUT / "vk-logo-dark.svg": lockup("dark"),
        OUT / "vk-logo-light.svg": lockup("light"),
        OUT / "vk-app-icon.svg": svg(64, 64, tile_body("ai"), "VK", px=512),
        # Favicon: tighter crop, heavier stroke, no small nodes (legible at 16px)
        ROOT / "public" / "favicon.svg": svg(64, 64, tile_body("fv", inset=0.98, nodes=False, width=6.2, radius=15), "VK", px=32),
    }
    for path, content in files.items():
        path.write_text(content, encoding="utf-8")
    print("wrote", ", ".join(p.name for p in files))


if __name__ == "__main__":
    main()
