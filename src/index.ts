import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import projectRouter from './routes/projectRoutes';
dotenv.config();
import { setupSwagger } from './swagger';

const app = express();
const PORT = process.env.PORT || 5000;

import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." }
});

app.use(limiter);

app.use(cors());
app.use(express.json());

app.use('/api/github', projectRouter);
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
function main() {
  setupSwagger(app);
  app.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`);
  });
}
main();

