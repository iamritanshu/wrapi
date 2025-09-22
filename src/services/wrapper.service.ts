import { validatePipelinePayload } from "../utils/validation";
import * as wrapperRepo from "../repositories/wrapper.repo";
import { PipelineStage, PipelineDoc } from "../models/pipeline.model";
import { generateWrapperId } from "../utils/wrapperId";
import {
  DUPLICATE_STAGE_INDEX_ERROR,
  PIPELINE_STAGE_CONTINUOUS_ERROR,
  VALIDATION_ERROR,
} from "../utils/app.constant";

export async function createWrapper(payloadRaw: any, createdBy?: string) {
  let payload: PipelineDoc;

  // Step 1: Validate payload (without version/status)
  try {
    payload = validatePipelinePayload(payloadRaw);
  } catch (err: any) {
    const error: any = new Error(`Payload validation failed: ${err.message}`);
    error.code = VALIDATION_ERROR;
    throw error;
  }

  // Step 2: Validate stage indices (unique & continuous)
  const stages = payload.stages as PipelineStage[];
  const indexes = stages.map((s) => s.stageIndex);
  const seen = new Set<number>();

  for (const i of indexes) {
    if (seen.has(i)) throw new Error(DUPLICATE_STAGE_INDEX_ERROR);
    seen.add(i);
  }

  const sorted = [...indexes].sort((a, b) => a - b);
  sorted.forEach((val, idx) => {
    if (val !== idx + 1) {
      throw new Error(PIPELINE_STAGE_CONTINUOUS_ERROR);
    }
  });

  // Step 3: Check for existing active wrapper with same accountId + wrapperName
  const existing = await wrapperRepo
    .findOne({
      accountId: payload.accountId,
      wrapperName: payload.wrapperName,
      status: "active",
    })
    .sort({ version: -1 });

  let version = 1;
  let wrapperId = generateWrapperId();

  if (existing) {
    // Reuse wrapperId and increment version
    wrapperId = existing.wrapperId;
    version = existing.version + 1;

    // Mark old wrapper inactive
    await wrapperRepo.updateOne(
      { _id: existing._id },
      { $set: { status: "inactive" } }
    );
  }

  // Step 4: Create new wrapper (backend sets version + status)
  return wrapperRepo.createWrapperTransactional({
    wrapperId,
    wrapperName: payload.wrapperName,
    accountId: payload.accountId,
    version,
    status: "active",
    stages: stages,
    createdBy: createdBy || null,
  });
}

export async function getWrapper(
  wrapperId: string,
  version: string | undefined,
  accountId: string
): Promise<PipelineDoc | null> {
  if (version) {
    return await wrapperRepo.getWrapperByIdVersion(
      wrapperId,
      version,
      accountId
    );
  } else {
    return await wrapperRepo.getLatestWrapperById(wrapperId, accountId);
  }
}
