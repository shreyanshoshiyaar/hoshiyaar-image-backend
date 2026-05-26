import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import uploadRouter from "./routes/upload.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*",
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