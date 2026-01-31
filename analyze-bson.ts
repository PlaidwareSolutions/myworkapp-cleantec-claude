import * as BSON from 'bson';
import * as fs from 'fs';
import * as path from 'path';

const exportDir = './mongodb_export/myworkapp';

// Read and parse BSON file
function parseBsonFile(filePath: string): any[] {
  const data = fs.readFileSync(filePath);
  const documents: any[] = [];
  let offset = 0;
  
  while (offset < data.length) {
    const size = data.readInt32LE(offset);
    if (size <= 0 || offset + size > data.length) break;
    const doc = BSON.deserialize(data.subarray(offset, offset + size));
    documents.push(doc);
    offset += size;
  }
  
  return documents;
}

// Analyze each collection
const files = fs.readdirSync(exportDir).filter(f => f.endsWith('.bson'));

for (const file of files) {
  const filePath = path.join(exportDir, file);
  const collectionName = file.replace('.bson', '');
  
  try {
    const docs = parseBsonFile(filePath);
    console.log(`\n=== ${collectionName.toUpperCase()} (${docs.length} documents) ===`);
    
    if (docs.length > 0) {
      console.log('Sample document keys:', Object.keys(docs[0]));
      console.log('First document:', JSON.stringify(docs[0], null, 2).substring(0, 1500));
    }
  } catch (e: any) {
    console.log(`Error parsing ${collectionName}:`, e.message);
  }
}
