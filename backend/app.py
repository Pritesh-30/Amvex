import streamlit as st
import cv2
import pytesseract
import numpy as np
from extract_fields import extract_data

st.title("AMVEX Smart Receipt Analyzer")

uploaded_file = st.file_uploader("Upload a receipt image", type=["jpg", "png", "jpeg"])

if uploaded_file is not None:
    # Read image
    file_bytes = np.asarray(bytearray(uploaded_file.read()), dtype=np.uint8)
    img = cv2.imdecode(file_bytes, 1)

    st.subheader("Original Receipt")
    st.image(img, use_column_width=True)

    # -----------------------------
    # Strong preprocessing
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

    st.subheader("Processed for OCR")
    st.image(thresh, use_column_width=True, channels="GRAY")

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

    st.subheader("Extracted Text")
    st.text(text)

    # -----------------------------
    # Field extraction
    # -----------------------------
    data = extract_data(text)

    st.subheader("Structured Data")
    if data:
        for key, value in data.items():
            st.write(f"**{key}:** {value}")
    else:
        st.write("No fields detected.")
