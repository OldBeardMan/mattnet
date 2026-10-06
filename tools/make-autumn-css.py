# Generates css/autumn.css and css/sleep.css from css/styles.css.
# Every colour-related declaration is copied under ":where(html.autumn-mode) ..." with
# spring colours shifted to an autumn palette. :where() adds no specificity and all
# colour declarations are copied (even unchanged ones like white), so the cascade
# stays exactly the same as in styles.css. Run again after editing styles.css:
#   python tools/make-autumn-css.py
# css/sleep.css is the "Go to sleep" switch in the footer: an autumn night. The autumn
# colours are shifted once more - light surfaces go dark, dark text goes light - under
# ":where(html.autumn-mode.sleep-mode) ...", so it only works inside autumn mode.
import colorsys
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "css" / "styles.css"
OUT = ROOT / "css" / "autumn.css"
SLEEP_OUT = ROOT / "css" / "sleep.css"

# Brand colours of streaming services stay as they are
KEEP = {"#1db954", "#ff0000", "#fc3c44", "#ff5500", "#629aa9", "#a238ff", "#e53935"}

COLOR_PROPS = ("color", "background", "background-color", "border", "border-color",
               "border-top", "border-bottom", "border-left", "border-right", "outline",
               "box-shadow", "text-shadow", "-webkit-text-fill-color", "fill", "stroke")

COLOR_RE = re.compile(r"#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\([^)]*\)")

EXTRA = """
/* Hand-made extras */
:root:where(.autumn-mode) { --cream: #f8f1e6; --cream-soft: #f2e7d8; }
:where(html.autumn-mode) .front { background-image: url("../images/bg-autumn.jpg"); }
:where(html.autumn-mode) .spring { background-image: url("../images/bg-autumn.jpg"); }
"""

SLEEP_EXTRA = """
/* Hand-made extras */
html:where(.autumn-mode.sleep-mode) { color-scheme: dark; }
:root:where(.autumn-mode.sleep-mode) { --cream: #1a130e; --cream-soft: #221913; }
:where(html.autumn-mode.sleep-mode) .masthead::before {
  background: linear-gradient(180deg, rgba(15, 9, 5, 0.45), rgba(15, 9, 5, 0.75));
}
"""

TEXT_PROPS = ("color", "-webkit-text-fill-color", "fill")


def autumn_hsl(h, l, s):
    deg = h * 360
    if s < 0.04:
        return h, l, s
    if 50 <= deg < 185:          # greens -> gold / orange / rust
        deg = max(16, 44 - (deg - 50) * 0.4)
    elif deg >= 290 or deg < 12:  # pinks, magentas -> brick red
        deg = 6
    elif 250 <= deg < 290:        # purples -> warm brown
        deg, s = 18, s * 0.6
    else:                         # oranges, browns, blues stay
        return h, l, s
    return deg / 360, l, s


def night_hsl(kind):
    """Autumn colour -> autumn night colour, depending on what the colour is used for."""
    def shift(h, l, s):
        if kind == "text":
            if l < 0.85:                 # dark text goes light; white text stays
                l = 0.92 - l * 0.45
        elif kind == "gradient":
            if l > 0.6:                  # pastel dividers -> deeper leaf colours
                l = 0.42
        elif kind == "border":
            if l > 0.7:
                l = 0.12 + (1 - l) * 0.6
        elif kind == "surface":
            if l > 0.8:                  # cream / white surfaces -> dark brown
                l = 0.07 + (1 - l) * 0.6
                if s < 0.04:
                    h, s = 25 / 360, 0.3
            elif l > 0.3:                # coloured buttons a bit deeper
                l *= 0.8
        return h, l, s
    return shift


def shift_hex(value, fn=autumn_hsl):
    v = value.lower()
    if v in KEEP:
        return value
    if len(v) == 4:
        v = "#" + "".join(c * 2 for c in v[1:])
    r, g, b = (int(v[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, l, s = fn(*colorsys.rgb_to_hls(r, g, b))
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return "#%02x%02x%02x" % tuple(round(c * 255) for c in (r, g, b))


def shift_rgba(value, fn=autumn_hsl):
    nums = [n.strip() for n in value[value.index("(") + 1:-1].split(",")]
    hexed = shift_hex("#%02x%02x%02x" % tuple(int(float(n)) for n in nums[:3]), fn)
    rgb = [str(int(hexed[i:i + 2], 16)) for i in (1, 3, 5)]
    name = value[:value.index("(")]
    return f"{name}({', '.join(rgb + nums[3:])})"


def shift(value, fn=autumn_hsl):
    return shift_rgba(value, fn) if value.startswith("rgb") else shift_hex(value, fn)


def night_kind(prop, val):
    """What a colour is used for, so sleep mode knows which way to move it."""
    if prop.startswith("--"):
        return "text" if ("ink" in prop or "accent" in prop) else "surface"
    if "shadow" in prop:
        return None
    if prop in TEXT_PROPS:
        return "text"
    if "gradient" in val:
        return "gradient"
    if prop.startswith("border") or prop in ("outline", "stroke"):
        return "border"
    return "surface"


def scope(selectors, mode=".autumn-mode"):
    out = []
    for sel in selectors.split(","):
        sel = sel.strip()
        if sel.startswith(":root"):
            out.append(f":root:where({mode})" + sel[5:])
        elif sel.startswith("html"):
            out.append(f"html:where({mode})" + sel[4:])
        else:
            out.append(f":where(html{mode}) " + sel)
    return ", ".join(out)


def rules(css):
    """Yield (at_rule_or_None, selector, body) for plain and @media-nested rules."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    i, n = 0, len(css)
    while i < n:
        j = css.find("{", i)
        if j < 0:
            break
        head = css[i:j].strip()
        if head.startswith("@"):
            depth, k = 1, j + 1
            while depth:
                depth += {"{": 1, "}": -1}.get(css[k], 0)
                k += 1
            if head.startswith("@media"):
                for _, sel, body in rules(css[j + 1:k - 1]):
                    yield head, sel, body
            i = k
        else:
            k = css.index("}", j)
            yield None, head, css[j + 1:k]
            i = k + 1


def write(out, title, blocks, extra):
    parts = [f"/* {title} - generated by tools/make-autumn-css.py, do not edit by hand */", ""]
    parts += [b + "\n" for b in blocks.pop(None, [])]
    for media, bl in blocks.items():
        inner = "\n".join("  " + line for b in bl for line in b.split("\n"))
        parts.append(f"{media} {{\n{inner}\n}}\n")
    parts.append(extra.strip() + "\n")
    out.write_text("\n".join(parts), encoding="utf-8")
    print("wrote", out)


def main():
    blocks, sleep_blocks = {}, {}
    for media, sel, body in rules(SRC.read_text(encoding="utf-8")):
        decls, sleep_decls = [], []
        for decl in body.split(";"):
            if ":" not in decl:
                continue
            prop, val = (p.strip() for p in decl.split(":", 1))
            new = COLOR_RE.sub(lambda m: shift(m.group(0)), val)
            if new != val or prop in COLOR_PROPS:
                decls.append(f"  {prop}: {new};")
            kind = night_kind(prop, new)
            if kind and (COLOR_RE.search(new) or prop in COLOR_PROPS):
                night = COLOR_RE.sub(lambda m: shift(m.group(0), night_hsl(kind)), new)
                sleep_decls.append(f"  {prop}: {night};")
        if decls:
            blocks.setdefault(media, []).append(f"{scope(sel)} {{\n" + "\n".join(decls) + "\n}")
        if sleep_decls:
            sleep_blocks.setdefault(media, []).append(
                f"{scope(sel, '.autumn-mode.sleep-mode')} {{\n" + "\n".join(sleep_decls) + "\n}")

    write(OUT, "AUTUMN MODE", blocks, EXTRA)
    write(SLEEP_OUT, "SLEEP MODE (autumn night)", sleep_blocks, SLEEP_EXTRA)


if __name__ == "__main__":
    main()
