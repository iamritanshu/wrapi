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
): Record<string, any> {
  const resolved: Record<string, any> = {};

  for (const key of Object.keys(bindings)) {
    resolved[key] = deepResolve(bindings[key], stageResults);
  }

  return resolved;
}

function deepResolve(value: any, stageResults: any[]): any {
  if (typeof value === "string") {
    const regex = /\?(\d+)\.(\w+)\?/g;
    let replaced = value.replace(regex, (_, stageIdx, field) => {
      const idx = parseInt(stageIdx, 10) - 1;
      const v = stageResults[idx]?.[field];
      return v != null && typeof v !== "string" ? JSON.stringify(v) : v ?? "";
    });

    try {
      if (
        (replaced.startsWith("{") && replaced.endsWith("}")) ||
        (replaced.startsWith("[") && replaced.endsWith("]"))
      ) {
        return JSON.parse(replaced);
      }
    } catch {}

    return replaced;
  }

  if (Array.isArray(value)) {
    return value.map((v) => deepResolve(v, stageResults));
  }

  if (typeof value === "object" && value !== null) {
    const obj: Record<string, any> = {};
    for (const k of Object.keys(value)) {
      obj[k] = deepResolve(value[k], stageResults);
    }
    return obj;
  }

  return value;
}
