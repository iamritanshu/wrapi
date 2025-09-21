import mongoose, { Document } from "mongoose";
import { getEpochSeconds } from "../utils/epochTimer";

export interface StageLog extends Document {
  executionId: string;
  stageIndex: number;
  stageName: string;
  stageType: string;
  status: "success" | "failed" | "skipped";
  startTime: number;
  endTime?: number;
  durationMs?: number;
  requestSnapshot?: object;
  responseSnapshot?: object;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

const StageLogSchema = new mongoose.Schema<StageLog>(
  {
    executionId: { type: String, required: true, index: true },
    stageIndex: { type: Number, required: true },
    stageName: { type: String },
    stageType: { type: String },
    status: {
      type: String,
      required: true,
      enum: ["success", "failed", "skipped"],
    },
    startTime: { type: Number, default: getEpochSeconds },
    endTime: { type: Number },
    durationMs: { type: Number },
    requestSnapshot: { type: Object },
    responseSnapshot: { type: Object },
    errorMessage: { type: String },
    createdAt: { type: Number, default: getEpochSeconds },
    updatedAt: { type: Number, default: getEpochSeconds },
  },
  { timestamps: false }
);

StageLogSchema.pre("save", function (next) {
  this.updatedAt = getEpochSeconds();
  if (!this.createdAt) this.createdAt = getEpochSeconds();
  next();
});

StageLogSchema.index({ executionId: 1 });

export const StageLogModel = mongoose.model<StageLog>(
  "StageLog",
  StageLogSchema,
  "stage_logs"
);
