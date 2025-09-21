import express, { Request, Response } from "express";
import dotenv from "dotenv";
import healthRouter from "./routes/health.routes";
import wrapperRouter from "./routes/wrapper.routes";

dotenv.config({
  path: process.env.NODE_ENV === "production" ? ".env.prod" : ".env.local",
});

const app = express();
app.use(express.json());

app.get("/", (_, res: Response) => res.send("Hello World!"));
app.use("/api/v1", wrapperRouter);

// Mount health route
app.use("/internal/health", healthRouter);

export default app;
