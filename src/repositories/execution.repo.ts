import { pool } from "../services/db.service";
import { StageLog } from "../models/stageLog.model";
import { PipelineStage } from "../models/pipeline.model";

//
// Start a new execution log
//
export async function startExecution(wrapperId: string, input: any) {
  const client = await pool.connect();
  try {
    const startTime = new Date();
    const result = await client.query(
      `INSERT INTO execution_logs 
         (wrapperId, version, accountId, status, startTime, inputSnapshot, createdAt, updatedAt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [wrapperId, "in-progress", startTime, input, startTime, startTime]
    );

    return result.rows[0]; // contains executionId
  } finally {
    client.release();
  }
}

//
// Log each stage execution
//
export async function logStage(
  executionId: number,
  stage: PipelineStage,
  result: any,
  status: "success" | "failed" | "skipped",
  errorMessage?: string
) {
  const client = await pool.connect();
  try {
    const startTime = new Date(); // in real case, pass from executor
    const endTime = new Date();

    await client.query(
      `INSERT INTO stage_logs
         (executionId, stageIndex, stageName, stageType, status, startTime, endTime, durationMs,
          requestSnapshot, responseSnapshot, errorMessage, createdAt, updatedAt)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        executionId,
        stage.stageIndex,
        stage.stageName,
        stage.stageType,
        status,
        startTime,
        endTime,
        endTime.getTime() - startTime.getTime(),
        stage.bindings || {}, // request snapshot
        result || {}, // response snapshot
        errorMessage || null,
        new Date(),
        new Date(),
      ]
    );
  } finally {
    client.release();
  }
}

//
// Finish execution (success or failed)
//
export async function finishExecution(
  executionId: number,
  status: "success" | "failed" | "partial",
  output: any,
  errorMessage?: string
) {
  const client = await pool.connect();
  try {
    const endTime = new Date();
    await client.query(
      `UPDATE execution_logs
       SET status=$1, endTime=$2, durationMs=$3, outputSnapshot=$4, errorMessage=$5, updatedAt=$6
       WHERE id=$7`,
      [
        status,
        endTime,
        null, // can calculate as endTime - startTime if you fetch startTime here
        output,
        errorMessage || null,
        new Date(),
        executionId,
      ]
    );
  } finally {
    client.release();
  }
}
