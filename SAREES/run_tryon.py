import argparse
import sys
import cv2
from pathlib import Path
from main import in_place_saree_clothing_swap, generate_saree_inpainting_mask, SAREES, SAREE_PROMPTS, IMAGES_DIR, OUTPUTS_DIR

def main():
    parser = argparse.ArgumentParser(description="Manual Saree Try-On & Mask Pipeline Runner")
    parser.add_argument("--person", type=str, default="images/customer_garden_dress.jpg", help="Path to customer portrait")
    parser.add_argument("--saree", type=int, default=2, help="Saree ID (1: Red, 2: Blue, 3: Green)")
    parser.add_argument("--output", type=str, default=None, help="Output image path")
    parser.add_argument("--dilation", type=int, default=18, help="Mask boundary dilation in pixels (default: 18)")
    parser.add_argument("--mask-only", action="store_true", help="Generate and save only the broadened inpainting mask")
    parser.add_argument("--show-prompts", action="store_true", help="Print the active positive and negative prompts")
    args = parser.parse_args()

    if args.show_prompts:
        print("\n=== AI PIPELINE TRY-ON PROMPTS ===")
        for s_id, p_data in SAREE_PROMPTS.items():
            print(f"\n[Saree {s_id}: {SAREES[s_id]['name']}]")
            print(f"Positive Prompt:\n  {p_data['positive']}")
            print(f"Negative Prompt:\n  {p_data['negative']}")
        if not args.mask_only and not args.output and args.saree == 2 and args.person == "images/customer_garden_dress.jpg":
            return

    person_path = Path(args.person)
    if not person_path.exists():
        print(f"[Error] Customer photo not found: {person_path}")
        sys.exit(1)

    if args.saree not in SAREES:
        print(f"[Error] Invalid saree ID: {args.saree}. Choose 1, 2, or 3.")
        sys.exit(1)

    saree_item = SAREES[args.saree]
    saree_path = IMAGES_DIR / saree_item["filename"]

    if args.mask_only:
        mask_out = Path(args.output) if args.output else OUTPUTS_DIR / f"broadened_mask_{person_path.stem}.png"
        print(f"\nGenerating Broadened Inpainting Mask (Dilation: {args.dilation}px):")
        print(f"  Customer: {person_path}")
        print(f"  Mask Output: {mask_out}")
        mask = generate_saree_inpainting_mask(str(person_path), dilation_px=args.dilation)
        cv2.imwrite(str(mask_out), mask)
        print(f"[Success] Broadened mask saved to: {mask_out.resolve()}")
        return

    if args.output:
        out_path = Path(args.output)
    else:
        out_path = OUTPUTS_DIR / f"manual_result_saree_{args.saree}.jpg"

    print(f"\nRunning High-Accuracy Saree Try-On:")
    print(f"  Customer: {person_path}")
    print(f"  Saree: {saree_item['name']} ({saree_path})")
    print(f"  Mask Dilation: {args.dilation}px")
    print(f"  Output: {out_path}")

    saree_color = saree_item.get("color_bgr", [50, 27, 158])
    success = in_place_saree_clothing_swap(str(person_path), str(saree_path), str(out_path), saree_color)

    if success and out_path.exists():
        print(f"\n[Success] Try-on completed! Saved to:\n  {out_path.resolve()}")
    else:
        print("\n[Error] Try-on processing failed.")
        sys.exit(1)

if __name__ == "__main__":
    main()
