#!/usr/bin/env python3
"""Create a new video/editing workspace; never overwrite an existing path."""
import argparse
from pathlib import Path
import shutil


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    dest = args.destination.expanduser().resolve()
    if dest.exists():
        parser.error(f"Destination already exists: {dest}")
    root = Path(__file__).resolve().parents[1]
    dest.mkdir(parents=True)
    for name in ("01_Final_Video", "02_Demo_Assets/Originals", "02_Demo_Assets/Edits", "03_Audio", "04_Brand_Assets"):
        (dest / name).mkdir(parents=True)
    shutil.copytree(root / "remotion-starter", dest / "05_Code", ignore=shutil.ignore_patterns("node_modules", "out", "dist", ".cache", ".DS_Store", ".env", ".env.*"))
    shutil.copytree(root / "templates", dest / "06_Editor_Notes")
    (dest / "START_HERE.md").write_text(
        "# Video workspace\n\nEdit 06_Editor_Notes/brief.md first.\n\n"
        "From 05_Code: `npm ci`, `npm run typecheck`, then `npm run studio`.\n"
        "Select Launch, UiMockup, DiagramLoop, SlackThread, OpenMuseLaunch, or OpenDotsLaunch in Studio.\n"
        "Render with `npm run render:slack`, `npm run render:openmuse`, or `npm run render:opendots` (generic launch/UI commands also remain).\n"
        "Exports start in 05_Code/out. After review, copy accepted exports to 01_Final_Video.\n"
        "Keep untouched captures in 02_Demo_Assets/Originals and log media properties/edits in the notes.\n",
        encoding="utf-8",
    )
    print(dest)


if __name__ == "__main__":
    main()
