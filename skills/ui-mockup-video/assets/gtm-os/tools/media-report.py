#!/usr/bin/env python3
"""Probe media and optionally decode it fully. Outputs JSON, not media mutations."""
import argparse
import json
from pathlib import Path
import subprocess


def report(path, decode):
    result = subprocess.run([
        "ffprobe", "-v", "error", "-show_format", "-show_streams", "-of", "json", str(path)
    ], check=True, capture_output=True, text=True)
    probe = json.loads(result.stdout)
    if decode:
        subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-i", str(path), "-f", "null", "-"], check=True, capture_output=True, text=True)
    fields = ("codec_type", "codec_name", "width", "height", "pix_fmt", "r_frame_rate", "avg_frame_rate", "duration", "nb_frames", "sample_rate", "channels")
    return {
        "file": path.name,
        "size_bytes": path.stat().st_size,
        "duration_seconds": probe.get("format", {}).get("duration"),
        "streams": [{k: s[k] for k in fields if k in s} for s in probe["streams"]],
        "full_decode": "passed" if decode else "not_run",
        "acquisition_cadence": "Not established by container metadata; record capture provenance separately.",
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--decode", action="store_true")
    parser.add_argument("files", type=Path, nargs="+")
    args = parser.parse_args()
    try:
        results = [report(p.expanduser().resolve(strict=True), args.decode) for p in args.files]
    except (OSError, subprocess.CalledProcessError, KeyError, json.JSONDecodeError) as exc:
        detail = getattr(exc, "stderr", None) or str(exc)
        parser.exit(1, f"Media check failed: {detail}\n")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
