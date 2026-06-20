import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config(); // Must be first so env vars are available before imports that read them
import projectRouter from './routes/projectRoutes';
import { setupSwagger } from './swagger';

const app = express();
// PORT defaults to 3000 (matching what the frontend points to).
// Set PORT=5000 in .env if you need a different port.
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
// Logger MUST come before routes so every request is captured.
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/github', projectRouter);

// ── Start ───────────────────────────────────────────────────────────────────
function main() {
    setupSwagger(app);
    app.listen(PORT, () => {
        console.log(`[server] Listening on http://localhost:${PORT}`);
    });
}
main();
