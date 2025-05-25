import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(__dirname, '../sql');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter migration name (e.g., create-users-table): ', (name) => {
  if (!name) {
    console.error('Migration name is required');
    rl.close();
    return;
  }
  
  const sanitizedName = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const filename = `${timestamp}-${sanitizedName}.sql`;
  const filePath = path.join(sqlDir, filename);
  
  const template = `-- UP migration
-- Description: ${name}

-- DOWN migration
--@DOWN
`;

  fs.writeFileSync(filePath, template);
  console.log(`Created migration file: ${filename}`);
  rl.close();
});