import * as BSON from 'bson';
import * as fs from 'fs';
const data = fs.readFileSync('./mongodb_export/myworkapp/roles.bson');
const docs: any[] = [];
let offset = 0;
while (offset < data.length) {
  const size = data.readInt32LE(offset);
  if (size <= 0 || offset + size > data.length) break;
  const doc = BSON.deserialize(data.subarray(offset, offset + size));
  docs.push(doc);
  offset += size;
}
console.log("ROLES:");
for (const doc of docs) {
  console.log(JSON.stringify({ _id: doc._id?.toString(), name: doc.name }, null, 2));
}
