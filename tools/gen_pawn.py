from __future__ import annotations

from pathlib import Path

from PIL import Image


TILE = 16
FRAMES = 8  # down(0-1), left(2-3), right(4-5), up(6-7)


def put(img: Image.Image, x: int, y: int, c: tuple[int, int, int, int]) -> None:
    if 0 <= x < TILE and 0 <= y < TILE:
        img.putpixel((x, y), c)


def rect(img: Image.Image, x0: int, y0: int, x1: int, y1: int, c: tuple[int, int, int, int]) -> None:
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(img, x, y, c)


def outline_rect(img: Image.Image, x0: int, y0: int, x1: int, y1: int, fill: tuple[int, int, int, int], ol: tuple[int, int, int, int]) -> None:
    rect(img, x0, y0, x1, y1, fill)
    for x in range(x0, x1 + 1):
        put(img, x, y0, ol)
        put(img, x, y1, ol)
    for y in range(y0, y1 + 1):
        put(img, x0, y, ol)
        put(img, x1, y, ol)


def draw_frame(direction: str, step: int) -> Image.Image:
    # Palette (RGBA)
    T = (0, 0, 0, 0)
    OL = (34, 26, 20, 255)
    SKIN = (236, 200, 164, 255)
    HAIR = (86, 60, 38, 255)
    SHIRT = (86, 122, 152, 255)
    SHIRT_HI = (108, 148, 178, 255)
    PANTS = (74, 70, 66, 255)
    BOOT = (48, 40, 34, 255)
    PACK = (92, 68, 46, 255)

    img = Image.new("RGBA", (TILE, TILE), T)

    # Feet coordinate is near bottom; keep sprite centered with some headroom.
    head_y0, head_y1 = 2, 6
    body_y0, body_y1 = 7, 10
    leg_y0, leg_y1 = 11, 14

    # Head
    outline_rect(img, 5, head_y0, 10, head_y1, SKIN, OL)
    # Hair cap
    rect(img, 5, head_y0, 10, head_y0 + 1, HAIR)
    put(img, 5, head_y0 + 2, HAIR)
    put(img, 10, head_y0 + 2, HAIR)

    # Face / back differences
    if direction == "down":
        put(img, 7, 4, OL)
        put(img, 9, 4, OL)
        put(img, 8, 5, (180, 120, 96, 255))  # nose hint
    elif direction == "left":
        put(img, 6, 4, OL)
        put(img, 5, 5, (180, 120, 96, 255))
    elif direction == "right":
        put(img, 9, 4, OL)
        put(img, 10, 5, (180, 120, 96, 255))
    elif direction == "up":
        # back of head shading
        rect(img, 5, 5, 10, 6, (218, 186, 154, 255))

    # Body
    outline_rect(img, 5, body_y0, 10, body_y1, SHIRT, OL)
    put(img, 6, body_y0 + 1, SHIRT_HI)
    put(img, 7, body_y0 + 1, SHIRT_HI)

    # Backpack on side/back
    if direction in ("left", "up"):
        outline_rect(img, 4, body_y0 + 1, 5, body_y1, PACK, OL)
    elif direction == "right":
        outline_rect(img, 10, body_y0 + 1, 11, body_y1, PACK, OL)

    # Arms
    if direction == "down":
        outline_rect(img, 4, body_y0 + 1, 4, body_y1 - 1, SKIN, OL)
        outline_rect(img, 11, body_y0 + 1, 11, body_y1 - 1, SKIN, OL)
    elif direction == "up":
        outline_rect(img, 4, body_y0 + 1, 4, body_y1 - 1, SHIRT, OL)
        outline_rect(img, 11, body_y0 + 1, 11, body_y1 - 1, SHIRT, OL)
    elif direction == "left":
        outline_rect(img, 4, body_y0 + 1, 4, body_y1 - 1, SKIN, OL)
    elif direction == "right":
        outline_rect(img, 11, body_y0 + 1, 11, body_y1 - 1, SKIN, OL)

    # Legs (two-step walk)
    outline_rect(img, 6, leg_y0, 9, leg_y1, PANTS, OL)
    # boots
    put(img, 6, leg_y1, BOOT)
    put(img, 7, leg_y1, BOOT)
    put(img, 8, leg_y1, BOOT)
    put(img, 9, leg_y1, BOOT)

    if step == 1:
        # alternate a pixel to suggest walking
        if direction in ("down", "up"):
            put(img, 6, leg_y0 + 1, OL)
            put(img, 9, leg_y0 + 1, PANTS)
        else:
            put(img, 6, leg_y0 + 1, PANTS)
            put(img, 9, leg_y0 + 1, OL)

    # Profile width hint (slightly shift features)
    if direction == "left":
        put(img, 10, 3, T)
        put(img, 10, 4, T)
    if direction == "right":
        put(img, 5, 3, T)
        put(img, 5, 4, T)

    return img


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    out_path = root / "src" / "assets" / "pawn.png"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    sheet = Image.new("RGBA", (FRAMES * TILE, TILE), (0, 0, 0, 0))
    order = [
        ("down", 0),
        ("down", 1),
        ("left", 0),
        ("left", 1),
        ("right", 0),
        ("right", 1),
        ("up", 0),
        ("up", 1),
    ]

    for i, (direction, step) in enumerate(order):
        frame = draw_frame(direction, step)
        sheet.paste(frame, (i * TILE, 0))

    sheet.save(out_path)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()

