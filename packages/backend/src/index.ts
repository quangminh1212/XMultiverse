import app from './app';
import { config } from './config';
import { info, getLogFilePath } from './services/logger';

app.listen(config.port, () => {
  const msg = `XMultiverse backend đang chạy tại http://localhost:${config.port}`;
  const demoMsg = `Demo mode: ${config.ai.demoMode ? 'BẬT' : 'TẮT'}`;
  const logMsg = `Log file: ${getLogFilePath()}`;

  // Log to file AND console (so CLI start can see it)
  info('server', msg, true);
  info('server', demoMsg, true);
  info('server', logMsg, true);
});
