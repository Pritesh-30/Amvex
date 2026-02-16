import re

def extract_data(text):
    data = {}

    clean_text = text.upper()
    clean_text = clean_text.replace(",", ".")

    # -------------------------
    # DATE extraction
    # -------------------------
    date_patterns = [
        r"\d{1,2}[\-/]\d{1,2}[\-/]\d{2,4}",
        r"\d{4}[\-/]\d{1,2}[\-/]\d{1,2}",
        r"\d{1,2}\s?[A-Z]{3,9}\s?\d{2,4}",
        r"[A-Z]{3,9}\s\d{1,2},?\s\d{4}",
    ]

    for pattern in date_patterns:
        match = re.search(pattern, clean_text)
        if match:
            data["Date"] = match.group()
            break

    # -------------------------
    # AMOUNT extraction
    # -------------------------
    amount_patterns = [
        r"TOTAL[^0-9]{0,20}([0-9]+\.[0-9]{2})",
        r"SUB TOTAL[^0-9]{0,20}([0-9]+\.[0-9]{2})",
        r"AMOUNT[^0-9]{0,20}([0-9]+\.[0-9]{2})",
        r"PAID[^0-9]{0,20}([0-9]+\.[0-9]{2})",
        r"₹\s?([0-9]+(?:\.[0-9]{2})?)",
        r"\n\s*([0-9]{1,6})\s*\n",  # Google Pay style
    ]

    for pattern in amount_patterns:
        match = re.search(pattern, clean_text)
        if match:
            data["Total"] = match.group(1)
            break

    # -------------------------
    # NAME extraction
    # -------------------------
    name_patterns = [
        r"TO\s+([A-Z\s]{3,40})",
        r"FROM[:\s]+([A-Z\s]{3,40})",
        r"MERCHANT[:\s]+([A-Z\s]{3,40})",
    ]

    for pattern in name_patterns:
        match = re.search(pattern, clean_text)
        if match:
            data["Merchant"] = match.group(1).strip()
            break

    # fallback merchant detection
    if "Merchant" not in data:
        lines = text.split("\n")
        for line in lines[:6]:
            line = line.strip()
            if len(line) > 4 and not any(char.isdigit() for char in line):
                data["Merchant"] = line
                break

    # -------------------------
    # UPI ID extraction (optional)
    # -------------------------
    upi_match = re.search(r"[a-zA-Z0-9.\-_]+@[a-zA-Z]+", text)
    if upi_match:
        data["UPI_ID"] = upi_match.group()

    return data
