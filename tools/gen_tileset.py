from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import random

from PIL import Image, ImageDraw


TILE = 16
COLS = 8
ROWS = 4


def clamp(v: int, lo: int = 0, hi: int = 255) -> int:
    return max(lo, min(hi, v))


def tint(c: tuple[int, int, int], dr: int, dg: int, db: int) -> tuple[int, int, int]:
    r, g, b = c
    return (clamp(r + dr), clamp(g + dg), clamp(b + db))


def put(img: Image.Image, x: int, y: int, c: tuple[int, int, int]) -> None:
    img.putpixel((x, y), c)


def dither_fill(img: Image.Image, base: tuple[int, int, int], seed: int, speck: tuple[int, int, int]) -> None:
    rnd = random.Random(seed)
    for y in range(TILE):
        for x in range(TILE):
            c = base
            if rnd.random() < 0.18:
                c = tint(base, -10, -10, -10)
            if rnd.random() < 0.10:
                c = tint(base, +10, +10, +10)
            if rnd.random() < 0.06:
                c = speck
            put(img, x, y, c)


def border(img: Image.Image, c: tuple[int, int, int]) -> None:
    for x in range(TILE):
        put(img, x, 0, c)
        put(img, x, TILE - 1, c)
    for y in range(TILE):
        put(img, 0, y, c)
        put(img, TILE - 1, y, c)


@dataclass(frozen=True)
class Palette:
    grass: tuple[int, int, int] = (66, 115, 66)
    grass_speck: tuple[int, int, int] = (56, 98, 58)
    dirt: tuple[int, int, int] = (104, 78, 56)
    dirt_speck: tuple[int, int, int] = (88, 64, 44)
    sand: tuple[int, int, int] = (156, 128, 78)
    sand_speck: tuple[int, int, int] = (140, 112, 66)
    water: tuple[int, int, int] = (44, 92, 132)
    water_speck: tuple[int, int, int] = (36, 78, 116)

    bark: tuple[int, int, int] = (92, 62, 40)
    leaf: tuple[int, int, int] = (50, 106, 58)
    leaf_dark: tuple[int, int, int] = (38, 86, 48)

    stone: tuple[int, int, int] = (145, 150, 160)
    stone_dark: tuple[int, int, int] = (106, 112, 124)

    berry: tuple[int, int, int] = (168, 52, 68)
    berry_leaf: tuple[int, int, int] = (58, 110, 62)

    fire: tuple[int, int, int] = (224, 122, 48)
    fire_hot: tuple[int, int, int] = (246, 210, 120)
    ash: tuple[int, int, int] = (60, 50, 44)

    wall: tuple[int, int, int] = (134, 102, 72)
    wall_dark: tuple[int, int, int] = (96, 72, 52)

    farm: tuple[int, int, int] = (104, 84, 58)
    farm_green: tuple[int, int, int] = (76, 122, 64)


PAL = Palette()


def tile_canvas() -> Image.Image:
    return Image.new("RGB", (TILE, TILE), (0, 0, 0))


def draw_grass(seed: int) -> Image.Image:
    img = tile_canvas()
    dither_fill(img, PAL.grass, seed, PAL.grass_speck)
    return img


def draw_dirt(seed: int) -> Image.Image:
    img = tile_canvas()
    dither_fill(img, PAL.dirt, seed, PAL.dirt_speck)
    return img


def draw_sand(seed: int) -> Image.Image:
    img = tile_canvas()
    dither_fill(img, PAL.sand, seed, PAL.sand_speck)
    return img


def draw_water(seed: int) -> Image.Image:
    img = tile_canvas()
    dither_fill(img, PAL.water, seed, PAL.water_speck)
    draw = ImageDraw.Draw(img)
    rnd = random.Random(seed)
    for _ in range(3):
        y = rnd.randrange(2, TILE - 3)
        x0 = rnd.randrange(1, 6)
        x1 = rnd.randrange(10, 15)
        draw.line((x0, y, x1, y), fill=tint(PAL.water, +12, +18, +18), width=1)
    return img


def draw_tree(seed: int) -> Image.Image:
    img = draw_grass(seed + 1)
    draw = ImageDraw.Draw(img)
    # trunk
    draw.rectangle((7, 8, 8, 14), fill=PAL.bark)
    # canopy (dither)
    rnd = random.Random(seed)
    for y in range(2, 10):
        for x in range(3, 13):
            dx = x - 8
            dy = y - 6
            if dx * dx + dy * dy <= 18 and rnd.random() > 0.12:
                c = PAL.leaf if rnd.random() > 0.25 else PAL.leaf_dark
                put(img, x, y, c)
    # outline hint
    put(img, 6, 9, PAL.leaf_dark)
    put(img, 10, 9, PAL.leaf_dark)
    return img


def draw_stone(seed: int) -> Image.Image:
    img = draw_dirt(seed + 2)
    draw = ImageDraw.Draw(img)
    draw.ellipse((4, 6, 12, 13), fill=PAL.stone, outline=PAL.stone_dark)
    put(img, 7, 8, tint(PAL.stone, +30, +30, +30))
    put(img, 9, 9, tint(PAL.stone, +20, +20, +20))
    return img


def draw_berry(seed: int) -> Image.Image:
    img = draw_grass(seed + 3)
    rnd = random.Random(seed)
    for _ in range(8):
        x = rnd.randrange(4, 12)
        y = rnd.randrange(7, 13)
        put(img, x, y, PAL.berry)
    # leaves
    for _ in range(10):
        x = rnd.randrange(4, 13)
        y = rnd.randrange(5, 12)
        if rnd.random() < 0.35:
            put(img, x, y, PAL.berry_leaf)
    return img


def draw_campfire(seed: int) -> Image.Image:
    img = draw_dirt(seed + 4)
    rnd = random.Random(seed)
    # stones ring
    for _ in range(10):
        x = rnd.randrange(4, 12)
        y = rnd.randrange(8, 14)
        if (x - 8) * (x - 8) + (y - 11) * (y - 11) <= 14 and rnd.random() > 0.2:
            put(img, x, y, PAL.stone_dark)
    # fire
    for y in range(4, 12):
        for x in range(5, 11):
            dx = x - 8
            dy = y - 9
            if dx * dx + dy * dy <= 9 and rnd.random() > 0.2:
                c = PAL.fire_hot if rnd.random() > 0.7 else PAL.fire
                put(img, x, y, c)
    # ash
    put(img, 8, 12, PAL.ash)
    return img


def draw_wall(seed: int) -> Image.Image:
    img = tile_canvas()
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 15, 15), fill=PAL.wall)
    # planks
    rnd = random.Random(seed)
    for x in range(0, 16, 4):
        c = PAL.wall_dark if rnd.random() < 0.5 else tint(PAL.wall, +8, +6, +4)
        draw.rectangle((x, 1, x + 2, 14), fill=c)
        draw.line((x + 3, 1, x + 3, 14), fill=PAL.wall_dark, width=1)
    border(img, PAL.wall_dark)
    return img


def draw_farm(seed: int) -> Image.Image:
    img = tile_canvas()
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, 15, 15), fill=PAL.farm)
    # furrows
    for y in range(2, 16, 4):
        draw.line((1, y, 14, y), fill=tint(PAL.farm, -20, -15, -10), width=1)
        draw.line((1, y + 1, 14, y + 1), fill=tint(PAL.farm, +10, +8, +6), width=1)
    # sprouts
    rnd = random.Random(seed)
    for _ in range(7):
        x = rnd.randrange(2, 14)
        y = rnd.randrange(2, 14)
        if rnd.random() < 0.5:
            put(img, x, y, PAL.farm_green)
    border(img, tint(PAL.farm, -25, -20, -15))
    return img


def build_tiles() -> list[Image.Image]:
    tiles: list[Image.Image] = []

    # Ground (frames 0..3)
    tiles.append(draw_grass(100))
    tiles.append(draw_dirt(200))
    tiles.append(draw_sand(300))
    tiles.append(draw_water(400))

    # Fill unused frames on row 0 to make grid consistent
    while len(tiles) < COLS:
        tiles.append(draw_grass(500 + len(tiles)))

    # Resources (row 1)
    tiles.append(draw_tree(600))
    tiles.append(draw_stone(700))
    tiles.append(draw_berry(800))
    while len(tiles) < COLS * 2:
        tiles.append(draw_grass(900 + len(tiles)))

    # Structures (row 2)
    tiles.append(draw_campfire(1000))
    tiles.append(draw_wall(1100))
    tiles.append(draw_farm(1200))
    while len(tiles) < COLS * 3:
        tiles.append(draw_dirt(1300 + len(tiles)))

    # UI / reserved (row 3)
    while len(tiles) < COLS * 4:
        tiles.append(draw_grass(1400 + len(tiles)))

    return tiles


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    out_path = root / "src" / "assets" / "tileset.png"
    out_path.parent.mkdir(parents=True, exist_ok=True)

    sheet = Image.new("RGB", (COLS * TILE, ROWS * TILE), (0, 0, 0))
    tiles = build_tiles()
    for i, tile in enumerate(tiles):
        x = (i % COLS) * TILE
        y = (i // COLS) * TILE
        sheet.paste(tile, (x, y))

    sheet.save(out_path)
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()

