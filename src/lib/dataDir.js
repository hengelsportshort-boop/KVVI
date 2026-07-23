import path from 'node:path';

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve('./public/data');

export default dataDir;
