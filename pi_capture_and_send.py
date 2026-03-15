#!/usr/bin/env python3
"""
Capture a Raspberry Pi photo and send it to the Vercel ingest endpoint.

Requirements:
  - Raspberry Pi camera stack (`libcamera-still`)
  - Python requests package (`pip install requests`)
"""

from __future__ import annotations

import argparse
import base64
import json
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Optional

import requests


def capture_image(output_path: Path) -> None:
    command = [
        "libcamera-still",
        "--nopreview",
        "--width",
        "1920",
        "--height",
        "1080",
        "-o",
        str(output_path),
    ]
    subprocess.run(command, check=True)


def encode_base64(path: Path) -> str:
    data = path.read_bytes()
    return base64.b64encode(data).decode("ascii")


def send_image(
    endpoint: str,
    image_base64: str,
    plant_id: Optional[str],
    notes: Optional[str],
    token: Optional[str],
    timeout_seconds: int = 30,
) -> requests.Response:
    headers = {"Content-Type": "application/json"}
    if token:
        headers["x-ingest-token"] = token

    payload = {"image": image_base64, "plantId": plant_id, "notes": notes}
    response = requests.post(
        endpoint, headers=headers, data=json.dumps(payload), timeout=timeout_seconds
    )
    return response


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Capture image and enqueue analysis job on Vercel."
    )
    parser.add_argument("--endpoint", required=True, help="Ingest URL, e.g. https://your-app.vercel.app/api/ingest")
    parser.add_argument("--plant-id", default=None, help="Optional identifier for the plant bed/pot.")
    parser.add_argument("--notes", default=None, help="Optional notes to include with this capture.")
    parser.add_argument("--token", default=None, help="Optional ingest shared token sent as x-ingest-token.")
    parser.add_argument("--retries", type=int, default=3, help="Number of retries if send fails.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    with tempfile.TemporaryDirectory() as tmpdir:
        image_path = Path(tmpdir) / "capture.jpg"
        print("Capturing image...")
        capture_image(image_path)
        print("Encoding image...")
        encoded = encode_base64(image_path)

    for attempt in range(1, args.retries + 1):
        try:
            print(f"Sending to {args.endpoint} (attempt {attempt}/{args.retries})...")
            response = send_image(
                endpoint=args.endpoint,
                image_base64=encoded,
                plant_id=args.plant_id,
                notes=args.notes,
                token=args.token,
            )
            print(f"Status: {response.status_code}")
            print(response.text)
            if response.ok:
                return 0
        except requests.RequestException as error:
            print(f"Request failed: {error}")

        if attempt < args.retries:
            backoff_seconds = 2**attempt
            print(f"Retrying in {backoff_seconds}s...")
            time.sleep(backoff_seconds)

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
