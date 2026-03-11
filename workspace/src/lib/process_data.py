import json
import os
import sys

input_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'raw_data.tsv')
output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'products.json')

def parse_price(price_str):
    if not price_str:
        return 0.0
    clean_str = price_str.replace('R$', '').strip().replace('.', '').replace(',', '.')
    try:
        return float(clean_str)
    except ValueError:
        return 0.0

try:
    with open(input_path, 'r', encoding='utf-8') as f:
        lines = [line.strip() for line in f if line.strip()]
except FileNotFoundError:
    print(f"ERROR: Could not find raw file at {input_path}")
    sys.exit(1)

products = []

for line in lines:
    cols = line.split('\t')
    location_code = cols[0].strip() if len(cols) > 0 else ''
    internal_id = cols[1].strip() if len(cols) > 1 else ''
    category = cols[2].strip() if len(cols) > 2 else ''
    subcategory = cols[3].strip() if len(cols) > 3 else ''
    description = cols[4].strip() if len(cols) > 4 else ''
    ncm = cols[5].strip() if len(cols) > 5 else ''
    sku = cols[6].strip() if len(cols) > 6 else ''
    price_str = cols[7].strip() if len(cols) > 7 else ''
    expiry_date = cols[8].strip() if len(cols) > 8 else ''

    price = parse_price(price_str)
    
    prod_id = f"PROD-{internal_id}" if internal_id else location_code
    name = f"{sku} - {description}" if sku else description

    desc_details = f"Categoria: {category} | Linha: {subcategory} | Código: {location_code} | NCM: {ncm}."
    if expiry_date:
        desc_details += f" Validade: {expiry_date}"

    products.append({
        "id": prod_id,
        "name": name,
        "description": desc_details,
        "price": price,
        "unit": "unidade",
        "stock": 10,
        "category": category,
        "image": "/images/filter.png",
        "ncm": ncm,
        "location": location_code,
        "sku": sku
    })

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(products, f, indent=2, ensure_ascii=False)

print(f"Successfully processed {len(products)} products and saved to products.json")
