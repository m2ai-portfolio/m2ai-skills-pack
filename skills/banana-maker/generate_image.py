#!/usr/bin/env python3
"""Banana Maker — Generate images using the Gemini API.

Standalone CLI script for the banana-maker Claude Code skill.
Uses the google-genai SDK with support for reference images,
aspect ratios, search grounding, thinking levels, and retry logic.

Models:
  flash    — gemini-3.1-flash-image-preview (Nano Banana 2)
  pro      — gemini-3-pro-image-preview (Nano Banana Pro)
  grounded — gemini-3.1-flash-image-preview + search tools
"""

import argparse
import mimetypes
import os
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

SCRIPT_DIR = Path(__file__).parent
OUTPUT_DIR = SCRIPT_DIR / "output"

MODEL_MAP = {
    "flash": "gemini-3.1-flash-image-preview",
    "pro": "gemini-3-pro-image-preview",
    "grounded": "gemini-3.1-flash-image-preview",
}

# Resolution string to image_size value mapping
SIZE_MAP = {
    "512": "512",
    "1K": "1K",
    "2K": "2K",
    "4K": "4K",
}

MAX_RETRIES = 3
RETRYABLE_CODES = {429, 500, 503}


def load_reference_image(path: str) -> types.Part:
    """Load a reference image file and return it as an inline_data Part."""
    image_path = Path(path)
    if not image_path.exists():
        print(f"Error: Reference image not found: {path}", file=sys.stderr)
        sys.exit(1)

    mime_type, _ = mimetypes.guess_type(str(image_path))
    if mime_type is None or not mime_type.startswith("image/"):
        print(f"Error: Not a recognized image file: {path}", file=sys.stderr)
        sys.exit(1)

    image_data = image_path.read_bytes()
    return types.Part.from_bytes(data=image_data, mime_type=mime_type)


def generate_image(
    prompt: str,
    model: str,
    output_path: Path,
    aspect_ratio: str = "1:1",
    image_size: str = "2K",
    reference_images: list[str] | None = None,
    search_mode: str | None = None,
    thinking: str | None = None,
) -> Path:
    """Generate an image using the Gemini API with retry logic."""
    # Prefer GOOGLE_API_KEY (paid tier with image gen quota),
    # fall back to GEMINI_API_KEY
    api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("Error: Neither GOOGLE_API_KEY nor GEMINI_API_KEY found.", file=sys.stderr)
        print("Ensure one is set in ~/.env.shared", file=sys.stderr)
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    model_id = MODEL_MAP[model]

    # Build content parts: reference images first, then text prompt
    parts: list[types.Part] = []

    if reference_images:
        for ref_path in reference_images:
            parts.append(load_reference_image(ref_path))

    parts.append(types.Part.from_text(text=prompt))

    # Build tools list for search grounding (grounded model only)
    tools = None
    if search_mode and model == "grounded":
        web = types.WebSearch() if search_mode in ("web", "both") else None
        img = types.ImageSearch() if search_mode in ("image", "both") else None

        tools = [types.Tool(
            google_search=types.GoogleSearch(
                search_types=types.SearchTypes(
                    web_search=web,
                    image_search=img,
                ),
            ),
        )]

    # Build image config with aspect ratio and explicit size
    image_config = types.ImageConfig(
        aspect_ratio=aspect_ratio,
        image_size=SIZE_MAP.get(image_size, "2K"),
    )

    # Build generation config
    config_kwargs = {
        "response_modalities": ["TEXT", "IMAGE"],
        "image_config": image_config,
        "tools": tools,
    }

    # Add thinking level for Flash 3.1 models
    if thinking and model in ("flash", "grounded"):
        config_kwargs["thinking_config"] = types.ThinkingConfig(
            thinking_level=thinking.upper(),
        )

    config = types.GenerateContentConfig(**config_kwargs)

    last_error = None
    for attempt in range(MAX_RETRIES):
        if attempt > 0:
            wait_time = (2 ** attempt)
            print(f"Retrying in {wait_time}s (attempt {attempt + 1}/{MAX_RETRIES})...")
            time.sleep(wait_time)

        try:
            response = client.models.generate_content(
                model=model_id,
                contents=types.Content(parts=parts),
                config=config,
            )

            # Extract image from response
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if part.inline_data:
                        # Determine file extension from mime type
                        mime = part.inline_data.mime_type or "image/png"
                        ext = mime.split("/")[-1]
                        if ext == "jpeg":
                            ext = "jpg"

                        # Update output path extension if needed
                        final_path = output_path.with_suffix(f".{ext}")
                        final_path.parent.mkdir(parents=True, exist_ok=True)
                        final_path.write_bytes(part.inline_data.data)

                        print(f"Image saved to {final_path}")

                        # Also print any text response
                        for text_part in response.candidates[0].content.parts:
                            if text_part.text:
                                print(f"Model notes: {text_part.text}")

                        return final_path

            print("Error: No image data in response.", file=sys.stderr)
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if part.text:
                        print(f"Model response: {part.text}", file=sys.stderr)
            sys.exit(1)

        except Exception as e:
            error_msg = str(e)
            is_retryable = (
                "overloaded" in error_msg.lower()
                or "429" in error_msg
                or "500" in error_msg
                or "503" in error_msg
            )

            if is_retryable and attempt < MAX_RETRIES - 1:
                last_error = e
                print(f"Model busy: {error_msg}", file=sys.stderr)
                continue

            print(f"Error: {error_msg}", file=sys.stderr)
            sys.exit(1)

    print(f"Error: All {MAX_RETRIES} attempts failed. Last error: {last_error}", file=sys.stderr)
    sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Banana Maker — Generate images with Gemini",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("prompt", help="The image generation prompt")
    parser.add_argument(
        "--model", "-m",
        required=True,
        choices=["flash", "pro", "grounded"],
        help="Model: flash (Nano Banana 2), pro (Nano Banana Pro), grounded (flash + search)",
    )
    parser.add_argument(
        "--output", "-o",
        type=Path,
        default=None,
        help="Output file path (default: output/generated_TIMESTAMP.png)",
    )
    parser.add_argument(
        "--aspect-ratio", "-a",
        default="1:1",
        choices=["1:1", "16:9", "9:16", "4:3", "3:4", "1:4", "4:1", "1:8", "8:1"],
        help="Aspect ratio (default: 1:1)",
    )
    parser.add_argument(
        "--size", "-s",
        default="2K",
        choices=["512", "1K", "2K", "4K"],
        help="Image size (default: 2K, 512 is Flash 3.1 only)",
    )
    parser.add_argument(
        "--reference", "-r",
        action="append",
        default=None,
        help="Reference image path (can be specified multiple times, max 14)",
    )
    parser.add_argument(
        "--search",
        choices=["web", "image", "both"],
        default=None,
        help="Enable Google Search grounding (requires --model grounded)",
    )
    parser.add_argument(
        "--thinking", "-t",
        choices=["minimal", "high"],
        default=None,
        help="Thinking level for Flash 3.1 (minimal or high)",
    )

    args = parser.parse_args()

    # Validate reference image count
    if args.reference and len(args.reference) > 14:
        print("Error: Maximum 14 reference images allowed.", file=sys.stderr)
        sys.exit(1)

    # Validate 512 requires Flash 3.1
    if args.size == "512" and args.model == "pro":
        print("Error: 512 resolution requires --model flash or grounded", file=sys.stderr)
        sys.exit(1)

    # Validate search requires grounded model
    if args.search and args.model != "grounded":
        print("Error: --search requires --model grounded", file=sys.stderr)
        sys.exit(1)

    # Validate thinking requires Flash 3.1
    if args.thinking and args.model == "pro":
        print("Error: --thinking requires --model flash or grounded", file=sys.stderr)
        sys.exit(1)

    # Build output path
    if args.output is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        args.output = OUTPUT_DIR / f"generated_{timestamp}.png"

    # Load environment
    env_shared = Path.home() / ".env.shared"
    if env_shared.exists():
        load_dotenv(env_shared)

    generate_image(
        prompt=args.prompt,
        model=args.model,
        output_path=args.output,
        aspect_ratio=args.aspect_ratio,
        image_size=args.size,
        reference_images=args.reference,
        search_mode=args.search,
        thinking=args.thinking,
    )


if __name__ == "__main__":
    main()
