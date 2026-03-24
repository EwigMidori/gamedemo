from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance


TILE = 16


WORLD_FRAMES = [
    ("grass", (4, 9)),
    ("dirt", (5, 9)),
    ("sand", (9, 9)),
    ("water", (4, 13)),
    ("tree", (4, 3)),
    ("stone", (4, 8)),
    ("berry", (4, 7)),
    ("campfire", (5, 23)),
    ("wall", (4, 20)),
    ("farm", (4, 15)),
    ("workbench", (4, 24)),
]

GENERATED_WORLD_FRAMES = (
    [f"wall_mask_{mask}" for mask in range(16)]
    + [
        "sapling_small",
        "sapling_medium",
        "sapling_large",
        "stone_cracked",
        "stone_broken",
        "farm_seeded",
        "farm_growing",
        "farm_ready",
        "chest",
    ]
)

UI_SOURCE_FRAMES = [
    ("heart_full", (4, 41)),
    ("heart_half", (5, 41)),
    ("heart_empty", (6, 41)),
    ("shield_full", (7, 41)),
    ("shield_half", (8, 41)),
    ("shield_empty", (9, 41)),
]

UI_GENERATED_FRAMES = [
    "food",
    "ration",
    "wood",
    "stone",
    "plank",
    "brick",
    "sapling",
    "chest",
]

WORLD_GRADES: dict[str, dict[str, object]] = {
    "grass": {"lift": 1.38, "mix": 0.34, "target": (136, 176, 112)},
    "dirt": {"lift": 1.34, "mix": 0.3, "target": (156, 124, 92)},
    "sand": {"lift": 1.26, "mix": 0.42, "target": (222, 196, 122)},
    "water": {"lift": 1.34, "mix": 0.48, "target": (88, 168, 226)},
    "tree": {"lift": 1.08, "mix": 0.18, "target": (110, 172, 120)},
    "stone": {"lift": 1.1, "mix": 0.16, "target": (150, 154, 164)},
    "berry": {"lift": 1.06, "mix": 0.14, "target": (146, 170, 132)},
    "campfire": {"lift": 1.04, "mix": 0.14, "target": (196, 144, 96)},
    "wall": {"lift": 1.08, "mix": 0.15, "target": (142, 126, 104)},
    "farm": {"lift": 1.12, "mix": 0.18, "target": (138, 118, 82)},
}

GROUND_BASES: dict[str, tuple[int, int, int]] = {
    "grass": (124, 164, 104),
    "dirt": (146, 112, 82),
    "sand": (214, 188, 118),
    "water": (70, 138, 208),
}


def crop_frame(sheet: Image.Image, col: int, row: int) -> Image.Image:
    left = col * TILE
    top = row * TILE
    return sheet.crop((left, top, left + TILE, top + TILE))


def grade_world_frame(name: str, frame: Image.Image) -> Image.Image:
    config = WORLD_GRADES.get(name)
    if not config:
        return frame

    lift = float(config["lift"])
    mix = float(config["mix"])
    target_r, target_g, target_b = config["target"]  # type: ignore[misc]

    colored = Image.new("RGBA", frame.size)
    pixels: list[tuple[int, int, int, int]] = []
    for red, green, blue, alpha in frame.getdata():
        if alpha <= 0:
            pixels.append((0, 0, 0, 0))
            continue

        mixed_red = int((red * (1 - mix) + target_r * mix) * lift)
        mixed_green = int((green * (1 - mix) + target_g * mix) * lift)
        mixed_blue = int((blue * (1 - mix) + target_b * mix) * lift)
        pixels.append((
            min(255, mixed_red),
            min(255, mixed_green),
            min(255, mixed_blue),
            alpha,
        ))

    colored.putdata(pixels)
    colored = ImageEnhance.Contrast(colored).enhance(1.06)

    # Ground tiles should be fully opaque so transparent source pixels
    # do not leak the scene background color.
    base = GROUND_BASES.get(name)
    if base:
        flat = Image.new("RGBA", frame.size, (*base, 255))
        flat.alpha_composite(colored)
        flat.putalpha(255)
        return flat

    return colored


def make_blank_icon() -> Image.Image:
    return Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))


def draw_food_icon() -> Image.Image:
    img = make_blank_icon()
    draw = ImageDraw.Draw(img)
    draw.ellipse((3, 5, 13, 14), fill=(194, 70, 88, 255))
    draw.ellipse((5, 7, 11, 12), fill=(230, 128, 144, 255))
    draw.rectangle((7, 2, 9, 6), fill=(80, 152, 86, 255))
    draw.rectangle((8, 1, 10, 3), fill=(114, 182, 92, 255))
    return img


def draw_ration_icon() -> Image.Image:
    img = make_blank_icon()
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((2, 4, 13, 13), radius=2, fill=(189, 142, 86, 255))
    draw.rounded_rectangle((4, 2, 11, 6), radius=1, fill=(224, 198, 106, 255))
    draw.rectangle((4, 8, 11, 10), fill=(120, 82, 52, 255))
    draw.rectangle((4, 11, 10, 12), fill=(153, 108, 66, 255))
    return img


def draw_wood_icon() -> Image.Image:
    img = make_blank_icon()
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((2, 7, 12, 11), radius=2, fill=(127, 82, 48, 255))
    draw.rounded_rectangle((4, 4, 14, 8), radius=2, fill=(156, 101, 58, 255))
    draw.ellipse((1, 7, 5, 11), fill=(177, 123, 76, 255))
    draw.ellipse((3, 4, 7, 8), fill=(201, 146, 94, 255))
    draw.line((7, 4, 11, 8), fill=(103, 65, 39, 255), width=1)
    draw.line((5, 7, 9, 11), fill=(99, 61, 35, 255), width=1)
    return img


def draw_stone_icon() -> Image.Image:
    img = make_blank_icon()
    draw = ImageDraw.Draw(img)
    draw.polygon(
        [(4, 12), (2, 9), (4, 5), (8, 3), (12, 4), (14, 8), (12, 12), (8, 13)],
        fill=(128, 136, 148, 255),
    )
    draw.polygon([(5, 10), (5, 7), (8, 5), (11, 6), (12, 9), (9, 11)], fill=(171, 178, 188, 255))
    return img


def draw_plank_icon() -> Image.Image:
    img = make_blank_icon()
    draw = ImageDraw.Draw(img)
    for offset, fill, line in (
        (0, (150, 99, 57, 255), (104, 66, 40, 255)),
        (3, (171, 114, 68, 255), (118, 76, 46, 255)),
        (6, (192, 130, 76, 255), (132, 86, 52, 255)),
    ):
        draw.rounded_rectangle((2 + offset, 4, 6 + offset, 13), radius=1, fill=fill)
        draw.line((4 + offset, 5, 4 + offset, 12), fill=line, width=1)
    return img


def draw_brick_icon() -> Image.Image:
    img = make_blank_icon()
    draw = ImageDraw.Draw(img)
    brick = (170, 93, 74, 255)
    mortar = (225, 194, 154, 255)
    draw.rounded_rectangle((2, 4, 14, 12), radius=1, fill=brick)
    draw.line((2, 8, 14, 8), fill=mortar, width=1)
    draw.line((5, 4, 5, 8), fill=mortar, width=1)
    draw.line((10, 4, 10, 8), fill=mortar, width=1)
    draw.line((8, 8, 8, 12), fill=mortar, width=1)
    return img


def draw_sapling_icon() -> Image.Image:
    img = make_blank_icon()
    draw = ImageDraw.Draw(img)
    draw.rectangle((7, 5, 8, 12), fill=(103, 77, 46, 255))
    draw.ellipse((3, 2, 8, 7), fill=(92, 170, 100, 255))
    draw.ellipse((8, 2, 13, 7), fill=(78, 148, 88, 255))
    draw.ellipse((5, 0, 11, 5), fill=(114, 194, 118, 255))
    return img


def draw_chest_icon() -> Image.Image:
    img = make_blank_icon()
    draw = ImageDraw.Draw(img)
    wood = (145, 98, 58, 255)
    wood_dark = (107, 70, 42, 255)
    wood_light = (184, 132, 84, 255)
    metal = (183, 188, 196, 255)
    draw.rounded_rectangle((2, 4, 13, 13), radius=1, fill=wood)
    draw.rectangle((2, 7, 13, 8), fill=wood_dark)
    draw.rectangle((2, 4, 13, 5), fill=wood_light)
    draw.rectangle((7, 4, 8, 13), fill=wood_dark)
    draw.rectangle((6, 7, 9, 10), fill=metal)
    return img


def draw_sapling_stage(stage: str) -> Image.Image:
    img = make_blank_icon()
    draw = ImageDraw.Draw(img)

    if stage == "small":
        trunk = (7, 9, 8, 13)
        leaves = [((5, 6, 9, 10), (92, 170, 100, 255)), ((7, 5, 11, 9), (78, 148, 88, 255))]
    elif stage == "medium":
        trunk = (7, 6, 8, 13)
        leaves = [
            ((4, 4, 9, 9), (92, 170, 100, 255)),
            ((7, 3, 12, 8), (78, 148, 88, 255)),
            ((5, 1, 10, 6), (114, 194, 118, 255)),
        ]
    else:
        trunk = (7, 4, 8, 13)
        leaves = [
            ((3, 4, 8, 9), (92, 170, 100, 255)),
            ((8, 4, 13, 9), (78, 148, 88, 255)),
            ((4, 1, 12, 6), (114, 194, 118, 255)),
            ((6, 0, 10, 4), (132, 210, 132, 255)),
        ]

    draw.rectangle(trunk, fill=(103, 77, 46, 255))
    for box, color in leaves:
        draw.ellipse(box, fill=color)
    return img


def draw_stone_stage(stage: str) -> Image.Image:
    img = draw_stone_icon()
    draw = ImageDraw.Draw(img)
    crack = (76, 82, 96, 255)
    if stage == "cracked":
        lines = [
            (6, 4, 8, 7),
            (8, 7, 7, 10),
            (8, 7, 11, 9),
            (5, 9, 7, 12),
        ]
    else:
        lines = [
            (5, 4, 8, 7),
            (8, 7, 6, 10),
            (8, 7, 11, 10),
            (6, 10, 8, 13),
            (9, 5, 12, 7),
            (4, 8, 6, 11),
        ]
    for x1, y1, x2, y2 in lines:
        draw.line((x1, y1, x2, y2), fill=crack, width=1)
    return img


def draw_farm_stage(stage: str) -> Image.Image:
    img = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    soil_dark = (98, 72, 46, 255)
    soil = (126, 92, 58, 255)
    soil_light = (152, 114, 72, 255)
    sprout = (124, 188, 92, 255)
    leaf = (92, 164, 76, 255)
    grain = (214, 190, 106, 255)

    draw.rectangle((1, 3, 14, 14), fill=soil)
    for y in (4, 7, 10, 13):
        draw.rectangle((1, y, 14, y), fill=soil_dark)
    for x in (3, 7, 11):
        draw.rectangle((x, 3, x, 14), fill=soil_light)

    if stage == "seeded":
        for x, y in ((4, 5), (8, 6), (11, 5), (5, 9), (9, 10), (12, 9)):
            draw.rectangle((x, y, x, y), fill=(208, 176, 122, 255))
    elif stage == "growing":
        for x in (4, 8, 12):
            draw.rectangle((x, 7, x, 11), fill=leaf)
            draw.ellipse((x - 2, 4, x + 2, 8), fill=sprout)
        draw.ellipse((3, 9, 7, 12), fill=sprout)
        draw.ellipse((9, 9, 13, 12), fill=sprout)
    else:
        for x in (4, 8, 12):
            draw.rectangle((x, 5, x, 12), fill=leaf)
            draw.ellipse((x - 2, 2, x + 2, 7), fill=grain)
            draw.ellipse((x - 1, 5, x + 3, 10), fill=sprout)
        draw.ellipse((3, 8, 7, 12), fill=grain)
        draw.ellipse((9, 8, 13, 12), fill=grain)
    return img


def draw_chest_world() -> Image.Image:
    img = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    wood = (118, 84, 56, 255)
    wood_dark = (82, 58, 38, 255)
    wood_light = (162, 118, 74, 255)
    band = (122, 130, 146, 255)
    draw.rounded_rectangle((2, 5, 13, 13), radius=1, fill=wood)
    draw.rectangle((2, 5, 13, 6), fill=wood_light)
    draw.rectangle((2, 9, 13, 10), fill=wood_dark)
    draw.rectangle((7, 5, 8, 13), fill=wood_dark)
    draw.rectangle((5, 4, 10, 6), fill=band)
    draw.rectangle((6, 8, 9, 11), fill=band)
    return img


def build_generated_ui_frame(name: str) -> Image.Image:
    if name == "food":
        return draw_food_icon()
    if name == "ration":
        return draw_ration_icon()
    if name == "wood":
        return draw_wood_icon()
    if name == "stone":
        return draw_stone_icon()
    if name == "plank":
        return draw_plank_icon()
    if name == "brick":
        return draw_brick_icon()
    if name == "sapling":
        return draw_sapling_icon()
    if name == "chest":
        return draw_chest_icon()
    raise KeyError(f"Unknown generated UI frame: {name}")


def draw_wall_autotile(mask: int) -> Image.Image:
    img = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    mortar = (68, 76, 92, 255)
    stone = (112, 128, 144, 255)
    stone_light = (148, 162, 176, 255)
    shadow = (46, 52, 67, 255)
    pillar = (90, 102, 118, 255)

    def rect(box: tuple[int, int, int, int], fill: tuple[int, int, int, int]) -> None:
        draw.rectangle(box, fill=fill)

    # Connector stubs first so the main body overlaps them cleanly.
    if mask & 1:  # north
        rect((6, 0, 10, 7), pillar)
        rect((6, 0, 10, 2), stone_light)
    if mask & 2:  # east
        rect((8, 6, 15, 10), pillar)
        rect((13, 6, 15, 10), stone_light)
    if mask & 4:  # south
        rect((6, 8, 10, 15), pillar)
        rect((6, 13, 10, 15), shadow)
    if mask & 8:  # west
        rect((0, 6, 7, 10), pillar)
        rect((0, 6, 2, 10), stone_light)

    rect((4, 4, 12, 12), stone)
    rect((4, 4, 12, 5), stone_light)
    rect((4, 11, 12, 12), shadow)
    rect((4, 6, 12, 7), mortar)
    rect((4, 9, 12, 10), mortar)
    rect((7, 4, 8, 12), mortar)

    # Single wall gets four little caps so it doesn't read as a blob.
    if mask == 0:
        rect((6, 2, 10, 4), stone_light)
        rect((6, 12, 10, 13), shadow)
        rect((2, 6, 4, 10), stone_light)
        rect((12, 6, 13, 10), shadow)

    return img


def build_generated_world_frame(name: str) -> Image.Image:
    if name.startswith("wall_mask_"):
        return draw_wall_autotile(int(name.split("_")[-1]))
    if name == "sapling_small":
        return draw_sapling_stage("small")
    if name == "sapling_medium":
        return draw_sapling_stage("medium")
    if name == "sapling_large":
        return draw_sapling_stage("large")
    if name == "stone_cracked":
        return draw_stone_stage("cracked")
    if name == "stone_broken":
        return draw_stone_stage("broken")
    if name == "farm_seeded":
        return draw_farm_stage("seeded")
    if name == "farm_growing":
        return draw_farm_stage("growing")
    if name == "farm_ready":
        return draw_farm_stage("ready")
    if name == "chest":
        return draw_chest_world()
    raise KeyError(f"Unknown generated world frame: {name}")


def save_sheet(sheet: Image.Image, entries: list[tuple[str, tuple[int, int]]], out_path: Path) -> dict[str, int]:
    out_sheet = Image.new("RGBA", (len(entries) * TILE, TILE), (255, 255, 255, 0))
    frame_map: dict[str, int] = {}
    for index, (name, (col, row)) in enumerate(entries):
        frame_map[name] = index
        frame = crop_frame(sheet, col, row)
        if out_path.name == "roguelike-world.png":
            frame = grade_world_frame(name, frame)
        out_sheet.paste(frame, (index * TILE, 0))
    out_sheet.save(out_path)
    return frame_map


def save_world_sheet(sheet: Image.Image, out_path: Path) -> dict[str, int]:
    frame_names = [name for name, _ in WORLD_FRAMES] + GENERATED_WORLD_FRAMES
    out_sheet = Image.new("RGBA", (len(frame_names) * TILE, TILE), (255, 255, 255, 0))
    frame_map: dict[str, int] = {}

    for index, (name, (col, row)) in enumerate(WORLD_FRAMES):
        frame_map[name] = index
        frame = grade_world_frame(name, crop_frame(sheet, col, row))
        out_sheet.paste(frame, (index * TILE, 0))

    for offset, name in enumerate(GENERATED_WORLD_FRAMES, start=len(WORLD_FRAMES)):
        frame_map[name] = offset
        out_sheet.paste(build_generated_world_frame(name), (offset * TILE, 0))

    out_sheet.save(out_path)
    return frame_map


def save_ui_sheet(sheet: Image.Image, out_path: Path) -> dict[str, int]:
    frame_names = [name for name, _ in UI_SOURCE_FRAMES] + UI_GENERATED_FRAMES
    out_sheet = Image.new("RGBA", (len(frame_names) * TILE, TILE), (255, 255, 255, 0))
    frame_map: dict[str, int] = {}

    for index, (name, (col, row)) in enumerate(UI_SOURCE_FRAMES):
        frame_map[name] = index
        out_sheet.paste(crop_frame(sheet, col, row), (index * TILE, 0))

    for offset, name in enumerate(UI_GENERATED_FRAMES, start=len(UI_SOURCE_FRAMES)):
        frame_map[name] = offset
        out_sheet.paste(build_generated_ui_frame(name), (offset * TILE, 0))

    out_sheet.save(out_path)
    return frame_map


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    src = root / "src" / "assets" / "vendor" / "roguelike-16-alpha.png"
    out_dir = root / "src" / "assets" / "generated"
    out_dir.mkdir(parents=True, exist_ok=True)

    sheet = Image.open(src).convert("RGBA")

    world_map = save_world_sheet(sheet, out_dir / "roguelike-world.png")
    ui_map = save_ui_sheet(sheet, out_dir / "roguelike-ui.png")

    manifest = {
        "tileSize": TILE,
        "world": world_map,
        "ui": ui_map,
        "source": src.name,
    }
    (out_dir / "roguelike-manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"Wrote {out_dir / 'roguelike-world.png'}")
    print(f"Wrote {out_dir / 'roguelike-ui.png'}")
    print(f"Wrote {out_dir / 'roguelike-manifest.json'}")


if __name__ == "__main__":
    main()
