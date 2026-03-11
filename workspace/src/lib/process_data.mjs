import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, '../data/raw_data.tsv');
const outputPath = path.join(__dirname, '../data/products.json');

// Helper to convert " R$ 6,60 " -> 6.60
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  let cleanStr = priceStr.replace('R$', '').trim().replace('.', '').replace(',', '.');
  return parseFloat(cleanStr) || 0;
}

try {
  let content;
  try {
    content = fs.readFileSync(inputPath, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.error(`ERROR: Could not find raw file at ${inputPath}`);
      console.error("Please save your spreadsheet data to 'src/data/raw_data.tsv' and try again.");
      process.exit(1);
    }
    throw err;
  }

  const lines = content.split('\n').filter(line => line.trim() !== '');

  const products = lines.map(line => {
    const cols = line.split('\t');
    
    // We expect 8 to 9 columns based on the sample
    const locationCode = cols[0]?.trim() || '';
    const internalId = cols[1]?.trim() || '';
    const category = cols[2]?.trim() || '';
    const subcategory = cols[3]?.trim() || '';
    const description = cols[4]?.trim() || '';
    const ncm = cols[5]?.trim() || '';
    const sku = cols[6]?.trim() || '';
    const priceStr = cols[7]?.trim() || '';
    const expiryDate = cols[8]?.trim() || '';

    const price = parsePrice(priceStr);

    return {
      id: internalId ? `PROD-${internalId}` : locationCode,
      name: sku ? `${sku} - ${description}` : description,
      description: `Categoria: ${category} | Linha: ${subcategory} | Código: ${locationCode} | NCM: ${ncm}. ${expiryDate ? 'Validade: ' + expiryDate : ''}`,
      price: price,
      unit: 'unidade',
      stock: 10,  // Default stock since it is not provided
      category: category,
      image: '/images/filter.png', // Temporary placeholder
      ncm: ncm,
      location: locationCode,
      sku: sku
    };
  });

  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2), 'utf8');
  console.log(`Successfully processed ${products.length} products and saved to products.json`);

} catch (e) {
  console.error('Error processing data:', e);
}
