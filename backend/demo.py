import cv2
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
from extract_fields import extract_data

# Load image
img = cv2.imread("sample.png")

# Preprocessing
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
gray = cv2.equalizeHist(gray)
blur = cv2.GaussianBlur(gray, (3, 3), 0)
thresh = cv2.adaptiveThreshold(
    blur, 255,
    cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv2.THRESH_BINARY,
    31, 2
)

# OCR
text = pytesseract.image_to_string(
    thresh,
    lang="amvex_full",
    config="--tessdata-dir ."
)

print("\n--- RAW OCR TEXT ---\n")
print(text)

data = extract_data(text)

print("\n--- EXTRACTED FIELDS ---\n")
for key, value in data.items():
    print(f"{key}: {value}")
