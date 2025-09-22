import { Request, Response } from "express";
import * as wrapperService from "../services/wrapper.service";

export async function createWrapper(req: Request, res: Response) {
  try {
    const result = await wrapperService.createWrapper(req.body);

    return res
      .status(201)
      .json({ status: 201, message: "Created Successfully!", data: result });
  } catch (err: any) {
    console.error("createWrapper error", err);

    if (err.code === "VALIDATION_ERROR") {
      return res.status(400).json({ message: err.message });
    }

    if (err?.code === "23505") {
      return res
        .status(409)
        .json({ message: "Wrapper version already exists" });
    }

    if (err?.name === "MongoServerError" && err.code === 11000) {
      return res
        .status(409)
        .json({ message: "Wrapper doc already exists in Mongo" });
    }

    return res
      .status(400)
      .json({ message: err.message || "Internal Server Error" });
  }
}

export async function getWrapper(req: Request, res: Response) {
  try {
    const { wrapperId } = req.params;
    const accountId = req.query.accountId as string | undefined;
    if (!accountId) {
      return res.status(400).json({ message: "Missing accountId query param" });
    }
    const version = req.query.version as string | undefined;

    const doc = await wrapperService.getWrapper(wrapperId, version, accountId);
    if (!doc) return res.status(204).json({ message: "Not found" });
    return res.json({ success: true, data: doc });
  } catch (err: any) {
    console.error("getWrapper error", err);
    return res.status(400).json({ message: err.message });
  }
}
