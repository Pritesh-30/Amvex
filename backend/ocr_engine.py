import cv2
import pytesseract
import numpy as np
from extract_fields import extract_data

# Set tesseract path (Windows)
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"


def process_receipt(image_path: str):
    # -----------------------------
    # Read image
    # -----------------------------
    img = cv2.imread(image_path)

    if img is None:
        return {"error": "Could not read image"}

    # -----------------------------
    # Strong preprocessing (same as Streamlit)
    # -----------------------------
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Contrast enhancement
    gray = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)

    # Denoise
    blur = cv2.GaussianBlur(gray, (3, 3), 0)

    # Otsu threshold
    _, thresh = cv2.threshold(
        blur,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    # -----------------------------
    # OCR with fallback
    # -----------------------------
    text = pytesseract.image_to_string(
        thresh,
        lang="amvex_full",
        config="--tessdata-dir ."
    )

    # fallback if OCR too short
    if len(text.strip()) < 10:
        text = pytesseract.image_to_string(thresh, lang="eng")

    # -----------------------------
    # Field extraction
    # -----------------------------
    data = extract_data(text)

    # -----------------------------
    # Return both raw + structured
    # -----------------------------
    return {
        "raw_text": text,
        "structured_data": data
    }
