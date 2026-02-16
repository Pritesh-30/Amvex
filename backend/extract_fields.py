import re

def extract_data(text, is_gpay=False):
    """
    Extract structured data from OCR text.
    Uses AMVEX custom extraction engine.
    """
    data = {}
    
    clean_text = text.upper()
    original_text = text
    lines = text.strip().split('\n')
    
    # -------------------------
    # DATE extraction - robust patterns
    # -------------------------
    date_patterns = [
        # "14 Feb 2026" or "30 Dec 2025" (GPay style)
        (r'(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})', 'DMY_WORD'),
        # "20-06-2018" or "04-06-18" (receipt style)
        (r'(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})', 'DMY'),
        # "2018-06-20" (ISO style)
        (r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})', 'YMD'),
    ]
    
    for pattern, fmt in date_patterns:
        match = re.search(pattern, clean_text)
        if match:
            if fmt == 'DMY_WORD':
                day, month, year = match.groups()
                data["Date"] = f"{day} {month.title()} {year}"
            elif fmt == 'DMY':
                day, month, year = match.groups()
                if len(year) == 2:
                    year = '20' + year
                data["Date"] = f"{day}-{month}-{year}"
            elif fmt == 'YMD':
                year, month, day = match.groups()
                data["Date"] = f"{day}-{month}-{year}"
            break
    
    # -------------------------
    # AMOUNT extraction - find the main transaction amount
    # -------------------------
    amounts = []
    
    # Pattern 1: ₹ symbol followed by amount (highest priority)
    rupee_matches = re.findall(r'₹\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)', original_text)
    for m in rupee_matches:
        try:
            amt = float(m.replace(',', ''))
            if 1 <= amt <= 1000000:
                amounts.append(('rupee', amt))
        except:
            pass
    
    # Pattern 2: TOTAL: amount
    total_match = re.search(r'TOTAL\s*[:\s]\s*(?:RM\s*)?([0-9]+\.[0-9]{2})', clean_text)
    if total_match:
        try:
            amounts.append(('total', float(total_match.group(1))))
        except:
            pass
    
    # Pattern 3: Standalone large numbers (GPay shows amount prominently)
    if is_gpay:
        # Look for amounts like "1,200" or "600" or "70" in the text
        big_nums = re.findall(r'\b([0-9]{1,3}(?:,[0-9]{3})+)\b', clean_text)
        for n in big_nums:
            try:
                amt = float(n.replace(',', ''))
                if 100 <= amt <= 1000000:
                    amounts.append(('comma', amt))
            except:
                pass
        
        # Also check for plain numbers on their own
        for line in lines:
            line = line.strip()
            if re.match(r'^[0-9]{2,6}$', line):
                try:
                    amt = float(line)
                    if 10 <= amt <= 1000000:
                        amounts.append(('standalone', amt))
                except:
                    pass
    
    # Pattern 4: RM amount (Malaysian receipts)
    rm_match = re.search(r'RM\s*([0-9]+\.[0-9]{2})', clean_text)
    if rm_match:
        try:
            amounts.append(('rm', float(rm_match.group(1))))
        except:
            pass
    
    # Choose the best amount
    if amounts:
        # Prefer: rupee > total > comma > rm > standalone
        priority = {'rupee': 1, 'total': 2, 'comma': 3, 'rm': 4, 'standalone': 5}
        amounts.sort(key=lambda x: (priority.get(x[0], 99), -x[1]))
        data["Total"] = str(amounts[0][1])
    
    # -------------------------
    # MERCHANT/NAME extraction
    # -------------------------
    merchant = None
    
    # GPay: "To Navnath Mugadum" pattern
    to_match = re.search(r'TO[:\s]+([A-Za-z][A-Za-z\s]{2,30})', clean_text)
    if to_match:
        name = to_match.group(1).strip()
        # Remove phone numbers and trailing junk
        name = re.sub(r'\s*\+?\d{2,}.*$', '', name)
        name = re.sub(r'\s+', ' ', name).strip()
        if len(name) >= 3 and name.upper() not in ['TO', 'THE']:
            merchant = name
    
    # Fallback: First line that looks like a business name
    if not merchant:
        skip_words = [
            'COMPLETED', 'PAID', 'PAY AGAIN', 'GOOGLE', 'UPI', 'BANK', 
            'TRANSACTION', 'RECEIPT', 'INVOICE', 'DATE', 'TOTAL', 'TAX',
            'GST', 'REG NO', 'ID:', 'FROM:', 'POWERED', 'CASH'
        ]
        
        for line in lines[:8]:
            line = line.strip()
            if len(line) < 3 or len(line) > 50:
                continue
            
            # Skip if line is mostly numbers
            alpha_count = sum(c.isalpha() for c in line)
            if alpha_count < len(line) * 0.4:
                continue
            
            # Skip common non-merchant lines
            if any(skip in line.upper() for skip in skip_words):
                continue
            
            # Skip lines starting with numbers (like invoice numbers)
            if re.match(r'^[0-9]', line):
                continue
                
            merchant = line
            break
    
    if merchant:
        # Clean and title case
        merchant = ' '.join(merchant.split())
        data["Merchant"] = merchant.title()
    
    # -------------------------
    # UPI ID extraction
    # -------------------------
    upi_match = re.search(r'([a-zA-Z0-9.\-_]+@[a-zA-Z]+)', text)
    if upi_match:
        data["UPI_ID"] = upi_match.group(1)
    
    return data
