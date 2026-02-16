Follow these steps exactly to run the backend.

---

Open terminal in backend folder

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Install Tesseract OCR (Windows)

Download from:
https://github.com/UB-Mannheim/tesseract/wiki

Install it.

Default install path:

C:\Program Files\Tesseract-OCR\tesseract.exe


Open ocr_engine.py and set:

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

Test the OCR model

Run:
```bash
python demo.py
```
Run the FastAPI backend
```bash
uvicorn main:app --reload
```
