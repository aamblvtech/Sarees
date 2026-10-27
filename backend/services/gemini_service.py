import logging
import re
from typing import Dict, Optional
import httpx

from backend.core.config import settings

logger = logging.getLogger("gemini-service")

_STYLING_CACHE: Dict[str, Dict[str, str]] = {}

FALLBACK_STYLING = {
    "saree": {
        "drape": "Drape with deep structured pleats at the waist and allow the ornate pallu to cascade fluidly over the left forearm to showcase the border.",
        "jewelry": "Pair with handcrafted temple gold or uncut polki choker, emerald stud earrings, and antique bangles.",
        "occasion": "Ideal for royal wedding receptions, traditional festivals, and high-profile cultural galas."
    },
    "kurti": {
        "drape": "Flowing silhouette with tailored bodice, paired effortlessly with flared silk palazzos or ankle-length cigarette pants.",
        "jewelry": "Statement silver oxidized jhumkas, a sleek metallic cuff, and handcrafted embroidered mojaris.",
        "occasion": "Suited for sangeet soirees, celebratory brunches, and festive family gatherings."
    },
    "lehenga": {
        "drape": "Sculpted can-can volume with pleated side-pinned dupatta, highlighting the intricate zardozi waistband.",
        "jewelry": "Regal layered kundan necklace, maang tikka, and statement cocktail ring with champagne gold heels.",
        "occasion": "Grand bridal celebrations, sangeet night galas, and luxury festive banquets."
    },
    "dress": {
        "drape": "Fluid drape with cinched waistline, creating an elongated contemporary silhouette.",
        "jewelry": "Minimalist platinum or rose-gold drop earrings, structured micro-bag, and strappy metallic stilettos.",
        "occasion": "Evening cocktail receptions, luxury art vernissages, and rooftop sunset dinners."
    },
    "shirt": {
        "drape": "Crisp tailored lines with French cuffs, paired with bespoke pleated trousers or dark selvedge denim.",
        "jewelry": "Brushed titanium chronograph, subtle mother-of-pearl cufflinks, and Goodyear-welted oxfords.",
        "occasion": "Executive gallery receptions, smart-casual dinners, and luxury weekend gatherings."
    },
    "default": {
        "drape": "Tailored couture drape harmonizing contemporary lines with effortless luxury movement.",
        "jewelry": "Curated fine jewelry accents and tonal luxury footwear.",
        "occasion": "Sophisticated evening gatherings and celebratory studio events."
    }
}

def parse_styling_text(text: str) -> Dict[str, str]:
    """Extracts Drape, Jewelry, and Event/Occasion sections from text."""
    result = {
        "drape": "",
        "jewelry": "",
        "occasion": ""
    }

    # Match patterns like * **Drape:** ... or 1. Drape: ...
    drape_match = re.search(r"(?:drape|silhouette)[\s*:]+([^\n*]+)", text, re.IGNORECASE)
    jewelry_match = re.search(r"(?:jewelry|accessories|accents)[\s*:]+([^\n*]+)", text, re.IGNORECASE)
    occasion_match = re.search(r"(?:event|occasion|pairing)[\s*:]+([^\n*]+)", text, re.IGNORECASE)

    if drape_match:
        result["drape"] = drape_match.group(1).strip()
    if jewelry_match:
        result["jewelry"] = jewelry_match.group(1).strip()
    if occasion_match:
        result["occasion"] = occasion_match.group(1).strip()

    # Fallback if regex missed bullet points
    if not (result["drape"] and result["jewelry"] and result["occasion"]):
        lines = [l.strip().lstrip("*-0123456789. ") for l in text.split("\n") if len(l.strip()) > 15]
        if len(lines) >= 3:
            result["drape"] = result["drape"] or lines[0]
            result["jewelry"] = result["jewelry"] or lines[1]
            result["occasion"] = result["occasion"] or lines[2]

    return result

async def get_luxury_styling_advice_async(
    garment_name: str,
    category: str = "saree",
    fabric: Optional[str] = None,
    color: Optional[str] = None
) -> Dict[str, str]:
    """
    Asynchronously generates personalized haute couture styling consultation using Gemini.
    Features in-memory cache and non-blocking timeout fallback.
    """
    cache_key = f"{garment_name.lower()}_{category.lower()}"
    if cache_key in _STYLING_CACHE:
        return _STYLING_CACHE[cache_key]

    cat_lower = (category or "").lower()
    fallback_key = "default"
    for k in ["saree", "kurti", "lehenga", "dress", "shirt"]:
        if k in cat_lower:
            fallback_key = k
            break
    fallback = FALLBACK_STYLING.get(fallback_key, FALLBACK_STYLING["default"])

    api_key = (settings.GEMINI_API_KEY or "").strip()
    if not api_key or len(api_key) < 15 or api_key.startswith("your_"):
        _STYLING_CACHE[cache_key] = fallback
        return fallback

    prompt = (
        f"You are the Head Stylist at luxury fashion house AURA ATELIER.\n"
        f"A customer is trying on:\n"
        f"- Garment: {garment_name}\n"
        f"- Category: {category}\n"
        f"- Fabric: {fabric or 'Luxury Textile'}\n"
        f"- Color: {color or 'Artisanal Hue'}\n\n"
        f"Provide 3 concise luxury styling recommendations:\n"
        f"- Drape: 1-2 sentence recommendation for the drape, pallu, fit, or silhouette.\n"
        f"- Jewelry: 1-2 sentence recommendation for fine jewelry and footwear.\n"
        f"- Occasion: 1-2 sentence recommendation for event, makeup, and hair coiffure.\n"
        f"Format strictly as 3 bullet points with bold titles (e.g. * **Drape:** ..., * **Jewelry:** ..., * **Occasion:** ...). Under 80 words total."
    )

    models_to_try = ["gemini-flash-latest", "gemini-flash-lite-latest"]

    for model_name in models_to_try:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }]
            }

            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            text_output = parts[0]["text"]
                            parsed = parse_styling_text(text_output)
                            advice = {
                                "drape": parsed.get("drape") or fallback["drape"],
                                "jewelry": parsed.get("jewelry") or fallback["jewelry"],
                                "occasion": parsed.get("occasion") or fallback["occasion"]
                            }
                            _STYLING_CACHE[cache_key] = advice
                            return advice
        except Exception as e:
            logger.warning(f"Error querying Gemini model {model_name} asynchronously: {e}")

    _STYLING_CACHE[cache_key] = fallback
    return fallback

def get_luxury_styling_advice(
    garment_name: str,
    category: str = "saree",
    fabric: Optional[str] = None,
    color: Optional[str] = None
) -> Dict[str, str]:
    """Synchronous wrapper with caching and fallback."""
    cache_key = f"{garment_name.lower()}_{category.lower()}"
    if cache_key in _STYLING_CACHE:
        return _STYLING_CACHE[cache_key]

    cat_lower = (category or "").lower()
    fallback_key = "default"
    for k in ["saree", "kurti", "lehenga", "dress", "shirt"]:
        if k in cat_lower:
            fallback_key = k
            break
    fallback = FALLBACK_STYLING.get(fallback_key, FALLBACK_STYLING["default"])

    api_key = (settings.GEMINI_API_KEY or "").strip()
    if not api_key or len(api_key) < 15 or api_key.startswith("your_"):
        _STYLING_CACHE[cache_key] = fallback
        return fallback

    prompt = (
        f"You are the Head Stylist at luxury fashion house AURA ATELIER.\n"
        f"A customer is trying on:\n"
        f"- Garment: {garment_name}\n"
        f"- Category: {category}\n"
        f"- Fabric: {fabric or 'Luxury Textile'}\n"
        f"- Color: {color or 'Artisanal Hue'}\n\n"
        f"Provide 3 concise luxury styling recommendations:\n"
        f"- Drape: 1-2 sentence recommendation for the drape, pallu, fit, or silhouette.\n"
        f"- Jewelry: 1-2 sentence recommendation for fine jewelry and footwear.\n"
        f"- Occasion: 1-2 sentence recommendation for event, makeup, and hair coiffure.\n"
        f"Format strictly as 3 bullet points with bold titles (e.g. * **Drape:** ..., * **Jewelry:** ..., * **Occasion:** ...). Under 80 words total."
    )

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={api_key}"
        with httpx.Client(timeout=8.0) as client:
            res = client.post(url, json={"contents": [{"parts": [{"text": prompt}]}]})
            if res.status_code == 200:
                data = res.json()
                candidates = data.get("candidates", [])
                if candidates and "content" in candidates[0]:
                    parts = candidates[0]["content"].get("parts", [])
                    if parts and "text" in parts[0]:
                        parsed = parse_styling_text(parts[0]["text"])
                        advice = {
                            "drape": parsed.get("drape") or fallback["drape"],
                            "jewelry": parsed.get("jewelry") or fallback["jewelry"],
                            "occasion": parsed.get("occasion") or fallback["occasion"]
                        }
                        _STYLING_CACHE[cache_key] = advice
                        return advice
    except Exception as e:
        logger.warning(f"Error querying Gemini: {e}")

    _STYLING_CACHE[cache_key] = fallback
    return fallback
