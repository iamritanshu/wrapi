import { MongoClient } from "mongodb";
import { PipelineStage, MongoParams } from "../../models/pipeline.model";
import { resolveBindings } from "./api.executor";

export default async function mongoExecutor(
  stage: PipelineStage,
  input: any,
  results: any[]
) {
  if (!stage.dbConfig?.connectionString) {
    throw new Error("Mongo connection missing");
  }

  const client = new MongoClient(stage.dbConfig.connectionString);
  await client.connect();

  try {
    const db = client.db();
    const coll = db.collection(stage.dbConfig.collection!);
    const params = stage.dbConfig.parameters as
      | MongoParams
      | Record<string, any>
      | undefined;

    let body: any;

    switch (stage.dbConfig.operation) {
      case "find":
        const filter = resolveBindings(params || {}, input, results);
        console.log(
          "Executing Mongo find on collection:",
          stage.dbConfig.collection,
          "with resolved filter:",
          filter
        );

        body = await coll.find(filter).toArray();
        break;
      case "insert":
        body = await coll.insertOne((params as Record<string, any>) || {});
        break;
      case "update": {
        const p = params as MongoParams;
        body = await coll.updateOne(p.filter || {}, { $set: p.update });
        break;
      }
      case "delete":
        body = await coll.deleteOne((params as Record<string, any>) || {});
        break;
      default:
        throw new Error(
          `Unsupported Mongo operation: ${stage.dbConfig.operation}`
        );
    }

    return {
      success: true,
      statusCode: 200,
      headers: {},
      body,
    };
  } catch (err: any) {
    return {
      success: false,
      statusCode: 500,
      headers: {},
      body: { error: err.message },
    };
  } finally {
    await client.close();
  }
}
