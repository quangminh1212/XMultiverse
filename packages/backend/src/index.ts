import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`XMultiverse backend đang chạy tại http://localhost:${config.port}`);
  console.log(`Demo mode: ${config.ai.demoMode ? 'BẬT' : 'TẮT'}`);
});
