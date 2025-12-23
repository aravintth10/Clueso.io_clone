const express = require("express");
const http = require("http");
const cors = require("cors");

const { ServerConfig, Logger } = require("./config");
const apiRoutes = require("./routes");
const recordingRoutes = require("./routes/v1/recording-routes");
const pythonRoutes = require("./routes/v1/python-routes");
const FrontendService = require("./services/frontend-service");


const app = express();
const httpServer = http.createServer(app);

// ---------------- SOCKET.IO ----------------
FrontendService.initialize(httpServer);

// ---------------- MIDDLEWARE ----------------
app.use(cors());

// Serve static assets
app.use("/uploads", express.static("uploads"));
app.use("/recordings", express.static("recordings"));

// IMPORTANT: recording routes BEFORE body parsers
app.use("/api/recording", recordingRoutes);

// Python AI routes
app.use("/api/python", pythonRoutes);

// Body parsers for normal APIs
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

// Other APIs
app.use("/api", apiRoutes);

// ---------------- START SERVER ----------------
const PORT = ServerConfig.PORT;

httpServer.listen(PORT, () => {
    console.log(`Successfully started server on PORT ${PORT}`);
    Logger.info("Server started");
    Logger.info("Socket.IO server ready for frontend connections");
});
