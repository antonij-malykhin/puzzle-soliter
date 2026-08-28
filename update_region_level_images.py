import json
from pathlib import Path

root = Path(r"c:\Users\Antonij\Projects\PuzzleMozaic")
levels_root = root / "assets" / "resources" / "levels"
images_root = root / "assets" / "sprites" / "images" / "regions"

for region in range(2, 11):
    region_dir = levels_root / f"region-{region}"
    region_json = region_dir / f"region-{region}.json"
    image_dir = images_root / f"region-{region}"

    if not region_dir.exists():
        raise FileNotFoundError(f"Missing level folder: {region_dir}")
    if not region_json.exists():
        raise FileNotFoundError(f"Missing region config: {region_json}")
    if not image_dir.exists():
        raise FileNotFoundError(f"Missing image folder: {image_dir}")

    image_names = sorted(
        p.stem
        for p in image_dir.iterdir()
        if p.is_file() and p.suffix.lower() in {".jpg", ".jpeg", ".png"} and not p.name.startswith("zz-region-")
    )

    level_files = sorted(
        region_dir.glob("level-*.json"),
        key=lambda p: int(p.stem.split("-")[-1]),
    )

    if len(level_files) != len(image_names):
        print(f"WARNING region-{region}: levels={len(level_files)} images={len(image_names)}")

    for idx, level_file in enumerate(level_files):
        if idx >= len(image_names):
            raise ValueError(f"No image entry left for {level_file.name} in region-{region}")

        with level_file.open("r", encoding="utf-8") as f:
            level_data = json.load(f)

        level_data["imageId"] = (
            f"sprites/images/regions/region-{region}/{image_names[idx]}/spriteFrame"
        )

        with level_file.open("w", encoding="utf-8") as f:
            json.dump(level_data, f, ensure_ascii=False, indent=4)
            f.write("\n")

    with region_json.open("r", encoding="utf-8") as f:
        region_data = json.load(f)

    region_data["regionImageId"] = (
        f"sprites/images/regions/region-{region}/zz-region-{region}/spriteFrame"
    )

    with region_json.open("w", encoding="utf-8") as f:
        json.dump(region_data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Updated region-{region}: {len(level_files)} levels and regionImageId")
