import { PipelineStage } from "../../models/pipeline.model";

export default async function responseHandler(
  stage: PipelineStage,
  input: any,
  stageResults: any[]
) {
  if (!stage) throw new Error("Stage is undefined");
  if (stage?.next?.value !== -1) throw new Error("Invalid response handler");

  const bindings: Record<string, any> = stage.bindings ?? {};
  const resolved = resolveBindings(bindings, stageResults);

  return {
    status: resolved.status ?? 200,
    headers: resolved.headers ?? {},
    body: resolved.body ?? {},
  };
}

function resolveBindings(
  bindings: Record<string, any> = {},
  stageResults: any[]
) {
  const resolved: Record<string, any> = {};

  for (const key of Object.keys(bindings)) {
    let value = bindings[key];

    if (typeof value === "string") {
      // Replace ?<stage>.<field>? with real values
      const regex = /\?(\d+)\.(\w+)\?/g;
      value = value.replace(regex, (_, stageIdx, field) => {
        const idx = parseInt(stageIdx, 10) - 1;
        const v = stageResults[idx]?.[field];
        // If value is object, leave as is
        return typeof v === "object" ? JSON.stringify(v) : v ?? "";
      });

      try {
        // Only parse JSON if string looks like JSON
        if (value.startsWith("{") || value.startsWith("[")) {
          resolved[key] = JSON.parse(value);
        } else {
          resolved[key] = value;
        }
      } catch {
        resolved[key] = value;
      }
    } else {
      // Already an object or primitive
      resolved[key] = value;
    }
  }

  return resolved;
}
