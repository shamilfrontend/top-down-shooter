"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const db_1 = require("./config/db");
const auth_1 = __importDefault(require("./routes/auth"));
const maps_1 = __importDefault(require("./routes/maps"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.use('/api/auth', auth_1.default);
app.use('/api/maps', maps_1.default);
const io = new socket_io_1.Server(httpServer, {
    cors: { origin: '*' },
});
const socket_1 = require("./socket");
(0, socket_1.setupSocketHandlers)(io);
const PORT = process.env.PORT || 3000;
async function start() {
    await (0, db_1.connectDB)();
    httpServer.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
start();
