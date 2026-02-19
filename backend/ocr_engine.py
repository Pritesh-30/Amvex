import cv2
import pytesseract
import numpy as np
from extract_fields import extract_data

# Set tesseract path (Windows)
pytesseract.pytesseract.tesseract_cmd = r"C:\\Program Files\\Tesseract-OCR\\tesseract.exe"


def is_dark_image(img):
    """Check if image is predominantly dark (like GPay screenshots)"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mean_brightness = np.mean(gray)
    return mean_brightness < 100  # Dark if average brightness < 100


def preprocess_dark_image(img):
    """Preprocess dark images like Google Pay screenshots"""
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Invert colors (dark to light)
    inverted = cv2.bitwise_not(gray)
    
    # Increase contrast
    inverted = cv2.normalize(inverted, None, 0, 255, cv2.NORM_MINMAX)
    
    # Apply adaptive thresholding for better text extraction
    thresh = cv2.adaptiveThreshold(
        inverted, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        11, 2
    )
    
    return thresh


def preprocess_light_image(img):
    """Preprocess normal/light receipts"""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Contrast enhancement
    gray = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX)
    
    # Denoise
    blur = cv2.GaussianBlur(gray, (3, 3), 0)
    
    # Otsu threshold
    _, thresh = cv2.threshold(
        blur, 0, 255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )
    
    return thresh


def process_receipt(image_path: str):
    # Read image
    img = cv2.imread(image_path)

    if img is None:
        return {"error": "Could not read image"}

    # Determine if dark or light image and preprocess accordingly
    is_dark = is_dark_image(img)
    
    if is_dark:
        thresh = preprocess_dark_image(img)
    else:
        thresh = preprocess_light_image(img)

    # OCR with multiple attempts
    # Try custom trained model first
    try:
        text = pytesseract.image_to_string(
            thresh,
            lang="amvex_full",
            config="--tessdata-dir . --psm 6"
        )
    except:
        text = ""
    
    # Fallback to English if result too short
    if len(text.strip()) < 10:
        text = pytesseract.image_to_string(
            thresh,
            lang="eng",
            config="--psm 6"
        )
    
    # For dark images (GPay), also try with different PSM modes
    if is_dark and len(text.strip()) < 20:
        # Try PSM 4 (single column of text)
        text2 = pytesseract.image_to_string(
            thresh,
            lang="eng",
            config="--psm 4"
        )
        if len(text2) > len(text):
            text = text2

    # Field extraction
    data = extract_data(text, is_gpay=is_dark)

    return {
        "raw_text": text,
        "structured_data": data,
        "image_type": "gpay" if is_dark else "receipt"
    }
