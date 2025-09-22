import mongoose, { Document } from "mongoose";
import { getEpochSeconds } from "../utils/epochTimer";

export interface ExecutionLog extends Document {
  wrapperId: string;
  version: number;
  accountId: string;
  requestId?: string;
  status: "success" | "failed" | "partial";
  startTime: number; // epoch seconds
  endTime?: number;
  durationMs?: number;
  errorMessage?: string;
  inputSnapshot?: object;
  outputSnapshot?: object;
  createdAt: number;
  updatedAt: number;
}

const ExecutionLogSchema = new mongoose.Schema<ExecutionLog>(
  {
    wrapperId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    accountId: { type: String, required: true, index: true },
    requestId: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toHexString(),
    },
    status: {
      type: String,
      required: true,
      enum: ["success", "failed", "partial"],
    },
    startTime: { type: Number, default: getEpochSeconds },
    endTime: { type: Number },
    durationMs: { type: Number },
    errorMessage: { type: String },
    inputSnapshot: { type: Object },
    outputSnapshot: { type: Object },
    createdAt: { type: Number, default: getEpochSeconds },
    updatedAt: { type: Number, default: getEpochSeconds },
  },
  { timestamps: false }
);

ExecutionLogSchema.pre("save", function (next) {
  this.updatedAt = getEpochSeconds();
  if (!this.createdAt) this.createdAt = getEpochSeconds();
  next();
});

ExecutionLogSchema.index({ wrapperId: 1, version: 1 });
ExecutionLogSchema.index({ accountId: 1 });
ExecutionLogSchema.index({ startTime: 1 });

export const ExecutionLogModel = mongoose.model<ExecutionLog>(
  "ExecutionLog",
  ExecutionLogSchema,
  "execution_logs"
);
