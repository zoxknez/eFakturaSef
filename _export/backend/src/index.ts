// Refer to original at ../../backend/src/index.ts
// Included here for debugging the line around ~129 as requested.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'OK' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

const PORT = config.PORT || 3003;
app.listen(PORT, () => {
  console.log(`Server started on ${PORT}`);
});
