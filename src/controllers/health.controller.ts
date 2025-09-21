import { Request, Response } from "express";
import { getHealthStatus } from "../services/health.service";
import { ENV } from "../config/env";
import { pool, mongo } from "../services/db.service";

export const healthController = async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== ENV.HEALTH_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const status = await getHealthStatus(pool, mongo);

  res.set(
    "X-DB-Info",
    JSON.stringify({
      postgres: { connected: status.postgres.connected },
      mongo: { connected: status.mongo.connected },
    })
  );

  return status.overall
    ? res.status(200).json({ message: "OK", status })
    : res.status(503).json({ message: "Service Unavailable", status });
};
