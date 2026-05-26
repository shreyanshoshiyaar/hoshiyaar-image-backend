import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import uploadRouter from "./routes/upload.js";

dotenv.config();

const app = express();

const allowedOrigin = process.env.CLIENT_ORIGIN || "*";
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigin === "*") return callback(null, true);
      const normalize = (u) => (typeof u === "string" && u.endsWith("/") ? u.slice(0, -1) : u);
      if (normalize(origin) === normalize(allowedOrigin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());

// Mongo connection (non-fatal if it fails)
const mongoUri = process.env.MONGODB_URI;
if (mongoUri) {
  mongoose
    .connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) =>
      console.error("MongoDB connection error:", err.message)
    );
} else {
  console.warn("MONGODB_URI not set. Running without database persistence.");
}

// Simple root route
app.get("/", (req, res) => {
  res.send("ITL backend is running");
});

// Upload API
app.use("/api/upload", uploadRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});