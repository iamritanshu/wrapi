import { PipelineDoc, PipelineStage } from "../models/pipeline.model";
import {
  startExecution,
  logStage,
  finishExecution,
} from "../repositories/execution.repo";
import apiExecutorService from "./executors/api.executor";
import responseHandler from "./executors/response.executor";

async function executeStage(
  stage: PipelineStage,
  input: any,
  handler: () => Promise<any>
) {
  const startTime = Date.now();
  try {
    const result = await handler();
    const endTime = Date.now();
    const durationMs = endTime - startTime;

    console.log(
      `Stage "${stage.stageName}" (index ${stage.stageIndex}) executed in ${durationMs} ms`
    );

    return { status: "success", result, durationMs };
  } catch (err: any) {
    const endTime = Date.now();
    const durationMs = endTime - startTime;

    console.error(
      `Stage "${stage.stageName}" (index ${stage.stageIndex}) failed in ${durationMs} ms`,
      err.message
    );

    if (stage.execution?.onError?.action === "continue") {
      return { status: "failed", message: err.message, durationMs };
    }
    throw err;
  }
}

//TODO: DB, Condition, Eval, Custom handlers can be added here

//
// Main Pipeline Executor
//
export async function executePipeline(
  wrapperId: string,
  pipeline: PipelineDoc,
  input: any
) {
  const pipelineStart = Date.now();
  try {
    let currentStageIndex = 0;
    let stageResults: any[] = [];

    while (
      currentStageIndex >= 0 &&
      currentStageIndex < pipeline.stages.length
    ) {
      const stage = pipeline.stages[currentStageIndex];

      const stageHandler = async () => {
        switch (stage.stageType) {
          case "API":
            return apiExecutorService(stage, input, stageResults);
          case "ResponseHandler":
            return responseHandler(stage, input, stageResults);
          default:
            throw new Error(`Unsupported stage type: ${stage.stageType}`);
        }
      };

      const { status, result, durationMs } = await executeStage(
        stage,
        input,
        stageHandler
      );

      // Save result along with duration
      stageResults[stage.stageIndex - 1] = { ...result, durationMs };

      currentStageIndex =
        stage.next?.type === "index" ? stage.next.value - 1 : -1;
    }

    const pipelineEnd = Date.now();
    console.log(
      `Pipeline "${wrapperId}" executed in ${pipelineEnd - pipelineStart} ms`
    );

    return stageResults[stageResults.length - 1];
  } catch (err: any) {
    const pipelineEnd = Date.now();
    console.error(
      `Pipeline "${wrapperId}" failed after ${pipelineEnd - pipelineStart} ms`,
      err.message
    );
    throw err;
  }
}
