import { Request, Response } from "express";
import { executePipeline } from "../services/pipelineExecutor.service";
import { PipelineModel, PipelineDoc } from "../models/pipeline.model";

export async function executeWrapper(req: Request, res: Response) {
  const { wrapperId, wrapperName } = req.params;

  try {
    const pipelineDoc: PipelineDoc | null = await PipelineModel.findOne({
      wrapperId,
      wrapperName,
      status: "active",
    }).lean();

    if (!pipelineDoc) {
      return res
        .status(204)
        .json({ status: 204, message: "Wrapper not found" });
    }

    const input = {
      query: req.query,
      headers: req.headers,
      body: req.body,
    };
    console.log("INPUTS:");
    console.dir(input, { depth: null, colors: true });

    const result = await executePipeline(wrapperId, pipelineDoc, input);

    // result is already stageResult object
    const lastStageResult = result;

    // Set headers if present
    if (
      lastStageResult?.headers &&
      typeof lastStageResult.headers === "object"
    ) {
      for (const [key, value] of Object.entries(lastStageResult.headers)) {
        res.set(key, typeof value === "string" ? value : JSON.stringify(value));
      }
    }

    // Pick the body
    let responseBody = lastStageResult?.body ?? {};

    console.log("RESPONSE BODY:");
    console.dir(responseBody, { depth: null, colors: true });

    return res.status(lastStageResult?.statusCode || 200).json(responseBody);
  } catch (err: any) {
    console.error("Execution failed:", err.message);
    return res.status(400).json({ message: err.message });
  }
}
