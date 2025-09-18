const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRouter = require("./routes/authRoutes");
const userRouter = require("./routes/userRoutes");
const adminRouter = require("./routes/adminRoutes");
const swapRequestRouter = require("./routes/swapRequestRoutes");
const messageRouter = require("./routes/messageRoutes");
const sessionRouter = require("./routes/sessionRoutes");
const ratingRouter = require("./routes/ratingRoutes");
const gamificationRouter = require("./routes/gamificationRoutes");
// Load env vars
dotenv.config();

// Connect to database
connectDB();

// Initialize gamification badges
const { initializeBadges } = require("./services/gamificationService");
initializeBadges();

// Initialize app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  },
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));

// Define Routes
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/admin", adminRouter);
app.use("/api/swap-requests", swapRequestRouter);
app.use("/api/messages", messageRouter);
app.use("/api/sessions", sessionRouter);
app.use("/api/ratings", ratingRouter);
app.use("/api/gamification", gamificationRouter);

// Global Error handler middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Socket.io setup
require("./socket/socketHandlers")(io);

// Store io instance in app for use in controllers
app.set("io", io);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
