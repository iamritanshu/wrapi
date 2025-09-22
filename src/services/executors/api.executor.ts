import http from "http";
import https from "https";
import { URL } from "url";
import { PipelineStage } from "../../models/pipeline.model";

/**
 * Universal API executor
 */
export default async function apiExecutorService(
  stage: PipelineStage,
  input: any,
  stageResults: any[] = []
) {
  try {
    if (!stage) throw new Error("Stage is undefined");
    if (!stage.config?.url)
      throw new Error(
        `Stage ${stage.stageName || stage.stageIndex} missing config.url`
      );

    input.inputParams = input.inputParams || input.query || {};
    input.inputHeaders = input.inputHeaders || input.headers || {};
    input.inputBody = input.inputBody || input.body || {};

    const method = (stage.methodType || "GET").toUpperCase();
    const retries = stage.config.retries ?? 0;
    const timeout = stage.config.timeoutMs ?? 10000;

    const queryParams = stage.bindings?.query
      ? resolveBindings(stage.bindings.query, input, stageResults)
      : { ...input.inputParams };

    const body = stage.bindings?.body
      ? resolveBindings(stage.bindings.body, input, stageResults)
      : input.inputBody;

    const headers = resolveHeaderBindings(
      stage.bindings?.headers,
      input,
      stageResults
    );

    const resolvedPathVars = stage.bindings?.pathVariables
      ? resolveBindings(stage.bindings.pathVariables, input, stageResults)
      : {};
    const placeholders = extractUrlKeys(stage.config.url);
    const urlVars: Record<string, any> = {};
    for (const ph of placeholders) {
      urlVars[ph] =
        resolvedPathVars[ph] ??
        queryParams[ph] ??
        resolvePath(`?0.query.${ph}?`, input, stageResults) ??
        "";
    }
    let url = resolveUrl(stage.config.url, urlVars);
    placeholders.forEach((ph) => delete queryParams[ph]);

    if (method === "GET" && Object.keys(queryParams).length > 0) {
      const qs = new URLSearchParams(queryParams).toString();
      url += (url.includes("?") ? "&" : "?") + qs;
    }

    const requestOptions = buildRequestOptions(
      url,
      method,
      headers,
      body,
      timeout
    );

    const response = await executeWithRetry(
      requestOptions,
      body,
      retries,
      timeout
    );

    return {
      success: true,
      statusCode: response.statusCode,
      headers: response.headers,
      body: response.body,
    };
  } catch (error: any) {
    console.error(`API Stage failed: ${error?.message}`, {
      stageName: stage?.stageName,
      stageIndex: stage?.stageIndex,
    });
    return {
      success: false,
      message: error?.message,
      statusCode: error?.statusCode || 500,
      headers: error?.headers || {},
      body: error?.body || null,
    };
  }
}

/* ---------- Helpers ---------- */

function buildRequestOptions(
  urlString: string,
  method: string,
  headers: Record<string, any>,
  body: any,
  timeout: number
): http.RequestOptions | https.RequestOptions {
  const urlObj = new URL(urlString);
  const isHttps = urlObj.protocol === "https:";

  const agent = isHttps
    ? new https.Agent({
        rejectUnauthorized: false, // skip cert validation (dev only)
        minVersion: "TLSv1.2",
        maxVersion: "TLSv1.3",
      })
    : undefined;

  const options: http.RequestOptions | https.RequestOptions = {
    protocol: urlObj.protocol,
    hostname: urlObj.hostname,
    port: urlObj.port,
    path: urlObj.pathname + urlObj.search,
    method,
    headers: { ...headers } as http.OutgoingHttpHeaders,
    agent,
    timeout,
  };

  const typedHeaders = options.headers as http.OutgoingHttpHeaders;

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    if (body && Object.keys(body).length > 0) {
      typedHeaders["Content-Type"] =
        typedHeaders["Content-Type"] || "application/json";
    } else if (Object.keys(body).length === 0) {
      typedHeaders["Content-Type"] =
        typedHeaders["Content-Type"] || "application/x-www-form-urlencoded";
    }
  }

  return options;
}

function executeWithRetry(
  options: http.RequestOptions | https.RequestOptions,
  body: any,
  retries: number,
  timeout: number
): Promise<{ statusCode: number; headers: any; body: any }> {
  const lib = options.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    let attempt = 0;

    const doRequest = () => {
      attempt++;
      const req = lib.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        res.on("end", () => {
          const data = Buffer.concat(chunks).toString();
          const contentType = res.headers["content-type"] || "";
          const parsedBody = contentType.includes("application/json")
            ? safeJsonParse(data)
            : data;

          if (res.statusCode && res.statusCode >= 500 && attempt <= retries) {
            const backoffMs = Math.min(2000, 200 * attempt);
            console.warn(
              `Request failed (attempt ${attempt}/${retries}), retrying in ${backoffMs}ms`
            );
            setTimeout(doRequest, backoffMs);
          } else {
            resolve({
              statusCode: res.statusCode || 500,
              headers: res.headers,
              body: parsedBody,
            });
          }
        });
      });

      req.on("error", (err) => {
        if (attempt <= retries) {
          const backoffMs = Math.min(2000, 200 * attempt);
          console.warn(
            `Request error (attempt ${attempt}/${retries}), retrying in ${backoffMs}ms:`,
            err.message
          );
          setTimeout(doRequest, backoffMs);
        } else {
          reject(err);
        }
      });

      req.setTimeout(timeout, () => req.destroy(new Error("Request timeout")));

      if (body && Object.keys(body).length > 0) {
        const payload =
          (options.headers as http.OutgoingHttpHeaders)["Content-Type"] ===
          "application/json"
            ? JSON.stringify(body)
            : new URLSearchParams(body).toString();
        req.write(payload);
      }

      req.end();
    };

    doRequest();
  });
}

function safeJsonParse(data: string) {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

/* ----------------- Helpers for bindings and path ----------------- */

export function resolveHeaderBindings(
  headerBindings: Record<string, any> | undefined,
  input: any,
  stageResults: any[] = []
): Record<string, any> {
  if (!headerBindings) return { ...input.inputHeaders };
  const out: Record<string, any> = {};
  Object.entries(headerBindings).forEach(([k, v]) => {
    let val: any =
      typeof v === "string" && v.startsWith("?")
        ? resolvePath(v, input, stageResults)
        : deepResolveTemplate(v, input, stageResults);
    if (val != null && typeof val === "object") val = JSON.stringify(val);
    if (val != null) out[k] = val;
  });
  return out;
}

export function resolveBindings(
  bindings: Record<string, any>,
  input: any,
  stageResults: any[] = []
): Record<string, any> {
  const res: Record<string, any> = {};
  Object.entries(bindings).forEach(([k, v]) => {
    res[k] =
      typeof v === "string" && v.startsWith("?")
        ? resolvePath(v, input, stageResults)
        : deepResolveTemplate(v, input, stageResults);
  });
  return res;
}

function resolveUrl(url: string, vars: Record<string, any>) {
  return url.replace(/{([^}]+)}/g, (_, key) =>
    encodeURIComponent(vars[key] ?? "")
  );
}

function extractUrlKeys(url: string): string[] {
  const matches = url.match(/{([^}]+)}/g);
  return matches ? matches.map((m) => m.slice(1, -1)) : [];
}

function deepResolveTemplate(
  obj: any,
  input: any,
  stageResults: any[] = []
): any {
  if (obj == null) return obj;
  if (typeof obj === "string" && obj.startsWith("?") && obj.endsWith("?"))
    return resolvePath(obj, input, stageResults);
  if (Array.isArray(obj))
    return obj.map((it) => deepResolveTemplate(it, input, stageResults));
  if (typeof obj === "object") {
    const res: Record<string, any> = {};
    Object.entries(obj).forEach(
      ([k, v]) => (res[k] = deepResolveTemplate(v, input, stageResults))
    );
    return res;
  }
  return obj;
}

function resolvePath(
  template: string,
  input: any,
  stageResults: any[] = []
): any {
  if (!template || template.length < 2) return null;
  const inner = template.slice(1, -1);
  const parts = inner.split(".");
  const idx = parseInt(parts[0], 10);
  let ref: any = idx === 0 ? input : stageResults[idx - 1];
  if (!ref) return null;
  for (let i = 1; i < parts.length; i++) {
    if (ref == null) return null;
    ref = ref[parts[i]];
  }
  return ref ?? null;
}
