import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import projectRouter from './routes/projectRoutes';
dotenv.config();
import { setupSwagger } from './swagger';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/github', projectRouter);
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});
app.use(errorHandler);

function main() {
  setupSwagger(app);
  app.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`);
  });
}
main();

