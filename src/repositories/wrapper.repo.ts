import mongoose from "mongoose";
import { PipelineDoc, PipelineModel } from "../models/pipeline.model";

export interface CreateWrapperPayload {
  wrapperId: string;
  wrapperName?: string;
  accountId: string;
  version: number;
  status?: string;
  stages: PipelineDoc["stages"];
  createdBy?: string | null;
}

export async function createWrapperTransactional(
  payload: CreateWrapperPayload
): Promise<PipelineDoc> {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const wrapper = await PipelineModel.create([payload], { session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return wrapper[0];
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

/**
 * Generic findOne for flexible queries
 */
export function findOne(query: any) {
  return PipelineModel.findOne(query);
}

/**
 * Generic updateOne for flexible updates
 */
export function updateOne(filter: any, update: any) {
  return PipelineModel.updateOne(filter, update);
}

/**
 * Fetch latest wrapper by accountId + wrapperName
 */
export async function getLatestWrapperByName(
  accountId: string,
  wrapperName: string
): Promise<PipelineDoc | null> {
  return PipelineModel.findOne({ accountId, wrapperName, status: "active" })
    .sort({ version: -1 })
    .lean();
}

export async function getWrapperByIdVersion(
  wrapperId: string,
  version: string,
  accountId: string
): Promise<PipelineDoc | null> {
  return PipelineModel.findOne({
    wrapperId,
    version: parseInt(version),
    accountId,
  }).lean();
}

export async function getLatestWrapperById(
  wrapperId: string,
  accountId: string
): Promise<PipelineDoc | null> {
  return PipelineModel.findOne({ wrapperId, accountId, status: "active" })
    .sort({ version: -1 })
    .lean();
}
