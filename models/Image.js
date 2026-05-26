import mongoose from "mongoose";

const imageSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    originalName: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    format: { type: String },
  },
  { timestamps: true }
);

const Image = mongoose.model("Image", imageSchema);

export default Image;

