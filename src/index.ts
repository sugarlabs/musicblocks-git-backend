import express, { NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config(); // Must be first so env vars are available before imports that read them
import projectRouter from './routes/projectRoutes';
import { setupSwagger } from './swagger';

const app = express();
// PORT defaults to 5000 (standard for Express API servers).
// The Music Blocks frontend runs on 3000; the API must be on a different port.
// Override with PORT=<n> in .env for production.
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────────────────────
// Logger MUST come before routes so every request is captured.
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// CORS: allow the known Planet frontend.
// Set CORS_ORIGIN in .env / systemd for production (e.g. https://musicblocks.sugarlabs.org).
// Falls back to '*' for local dev convenience.
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/github', projectRouter);

// ── Global error handler ────────────────────────────────────────────────────
// Catches any error thrown inside a middleware or route handler that wasn't
// caught locally. Prevents unhandled rejections from crashing the process.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[uncaught-error]', err);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Start ───────────────────────────────────────────────────────────────────
function main() {
    setupSwagger(app);
    app.listen(PORT, () => {
        console.log(`[server] Listening on http://localhost:${PORT}`);
        console.log(`[server] SQLite: ${process.env.SQLITE_PATH || 'default local path'}`);
        console.log(`[server] CORS origin: ${corsOrigin}`);
        console.log(`[server] GitHub org: ${process.env.ORG_NAME}`);
    });
}
main();
