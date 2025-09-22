import { pool } from "./db.service";
import mongoose from "mongoose";

const shutdownSignals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGQUIT"];

const gracefulShutdown = async (signal?: NodeJS.Signals) => {
  try {
    console.log(
      `\n Received ${signal || "shutdown"} signal. Closing connections...`
    );

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
    }

    if (pool) {
      await pool.end();
      console.log("PostgreSQL pool closed.");
    }

    process.exit(0);
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

shutdownSignals.forEach((signal) =>
  process.on(signal, () => gracefulShutdown(signal))
);

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  gracefulShutdown();
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  gracefulShutdown();
});

export default gracefulShutdown;
