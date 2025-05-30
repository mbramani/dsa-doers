import app from './app';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { serverConfig } from './utils/config';

dotenv.config();

const PORT = serverConfig.port;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});