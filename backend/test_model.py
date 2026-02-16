import cv2
import pytesseract

img = cv2.imread("sample.png")

text = pytesseract.image_to_string(
    img,
    lang="amvex",
    config="--tessdata-dir ."
)

print("OCR Output:\n")
print(text)
