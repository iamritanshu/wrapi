import mongoose, { Document } from "mongoose";
import { getEpochSeconds } from "../utils/epochTimer";
import { StageType } from "../types/stage.type";

export interface PipelineStage {
  stageIndex: number;
  stageName: string;
  stageType: StageType;
  methodType?: "GET" | "POST" | "PUT" | "DELETE";
  next: { type: "index"; value: number };
  config?: Record<string, any>;
  bindings?: Record<string, any>;
  execution?: {
    parallel?: boolean;
    onError?: { action: "abort" | "continue" };
  };
}

export interface PipelineDoc extends Document {
  wrapperId: string;
  wrapperName?: string;
  accountId: string;
  version: number;
  status: string;
  stages: PipelineStage[];
  createdAt: number;
  updatedAt: number;
}

const StageSchema = new mongoose.Schema(
  {
    stageIndex: { type: Number, required: true },
    stageName: { type: String, required: true },
    stageType: { type: String, required: true },
    methodType: { type: String },
    next: { type: Object, default: { type: "index", value: -1 } },
    config: { type: Object, default: {} },
    bindings: { type: Object, default: {} },
    execution: { type: Object, default: {} },
  },
  { _id: false }
);

const PipelineSchema = new mongoose.Schema<PipelineDoc>(
  {
    wrapperId: { type: String, required: true },
    wrapperName: { type: String, required: true },
    accountId: { type: String, required: true },
    version: { type: Number, default: 1 },
    status: { type: String, default: "active" },
    stages: { type: [StageSchema], required: true },
    createdAt: { type: Number, default: getEpochSeconds },
    updatedAt: { type: Number, default: getEpochSeconds },
  },
  { timestamps: false }
);

PipelineSchema.index(
  { wrapperId: 1, version: 1, accountId: 1 },
  { unique: true }
);

PipelineSchema.index(
  { wrapperId: 1, wrapperName: 1, status: 1 },
  { unique: false }
);

PipelineSchema.index(
  { accountId: 1, wrapperName: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "active" },
  }
);

PipelineSchema.pre("save", function (next) {
  this.updatedAt = getEpochSeconds();
  if (!this.createdAt) this.createdAt = getEpochSeconds();
  next();
});

export const PipelineModel = mongoose.model<PipelineDoc>(
  "Pipeline",
  PipelineSchema,
  "pipelines"
);
