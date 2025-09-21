import { PipelineStage, PipelineDoc } from "../models/pipeline.model";

const allowedStageTypes = [
  "API",
  "DB",
  "Condition",
  "Eval",
  "ResponseHandler",
] as const;

const allowedMethodTypes = ["GET", "POST", "PUT", "DELETE"] as const;

function isString(value: any, field: string, maxLength?: number) {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  if (maxLength && value.length > maxLength) {
    throw new Error(`${field} exceeds max length ${maxLength}`);
  }
}

function isNumber(value: any, field: string, min?: number) {
  if (typeof value !== "number" || isNaN(value)) {
    throw new Error(`${field} must be a number`);
  }
  if (min !== undefined && value < min) {
    throw new Error(`${field} must be >= ${min}`);
  }
}

function isBoolean(value: any, field: string) {
  if (typeof value !== "boolean") throw new Error(`${field} must be boolean`);
}

function isOneOf<T extends readonly string[]>(
  value: any,
  field: string,
  allowed: T
) {
  if (!allowed.includes(value)) {
    throw new Error(`${field} must be one of: ${allowed.join(", ")}`);
  }
}

function validateNext(next: any) {
  if (next.type === "respIndex") {
    return;
  }
  if (!next || typeof next !== "object")
    throw new Error("next is required and must be an object");
  if (next.type !== "index") throw new Error('next.type must be "index"');
  isNumber(next.value, "next.value", 0);
}

export function validateStage(stage: any): PipelineStage {
  if (!stage || typeof stage !== "object") {
    throw new Error("Stage must be an object");
  }

  isNumber(stage.stageIndex, "stageIndex", 0);
  isString(stage.stageName, "stageName", 200);
  isOneOf(stage.stageType, "stageType", allowedStageTypes);

  if (stage.methodType !== undefined) {
    isOneOf(stage.methodType, "methodType", allowedMethodTypes);
  }

  validateNext(stage.next);

  if (stage.execution) {
    if (stage.execution.parallel !== undefined) {
      isBoolean(stage.execution.parallel, "execution.parallel");
    }
    if (stage.execution.onError) {
      if (
        stage.execution.onError.action !== "abort" &&
        stage.execution.onError.action !== "continue"
      ) {
        throw new Error(
          'execution.onError.action must be "abort" or "continue"'
        );
      }
    }
  }

  // bindings, config are free-form objects => only check type
  if (stage.bindings && typeof stage.bindings !== "object") {
    throw new Error("bindings must be an object");
  }
  if (stage.config && typeof stage.config !== "object") {
    throw new Error("config must be an object");
  }

  return stage as PipelineStage;
}

export function validatePipelinePayload(payload: any): PipelineDoc {
  if (!payload || typeof payload !== "object")
    throw new Error("Pipeline payload must be an object");

  isString(payload.accountId, "accountId", 255);

  if (payload.wrapperName !== undefined) {
    isString(payload.wrapperName, "wrapperName", 255);
  }

  if (
    !Array.isArray(payload.stages) ||
    payload.stages.length < 1 ||
    payload.stages.length > 200
  ) {
    throw new Error("Stages must be an array with 1–200 stages");
  }

  payload.stages.forEach((s: any) => validateStage(s));

  return payload as PipelineDoc;
}
