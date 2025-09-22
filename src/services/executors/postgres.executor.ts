import { Client } from "pg";
import { PipelineStage } from "../../models/pipeline.model";

export default async function postgresExecutor(
  stage: PipelineStage,
  input: any,
  results: any[]
) {
  if (!stage.dbConfig?.connectionString) {
    throw new Error("Postgres connection missing");
  }

  const client = new Client({
    connectionString: stage.dbConfig.connectionString,
  });
  await client.connect();

  try {
    const params = Array.isArray(stage.dbConfig.parameters)
      ? stage.dbConfig.parameters
      : [];

    const res = await client.query(stage.dbConfig.query!, params);

    return {
      success: true,
      statusCode: 200,
      headers: {},
      body: res.rows,
    };
  } catch (err: any) {
    return {
      success: false,
      statusCode: 500,
      headers: {},
      body: { error: err.message },
    };
  } finally {
    await client.end();
  }
}
