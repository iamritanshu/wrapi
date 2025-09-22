import "./config/env";
import app from "./app";
import { connectDatabases } from "./services/db.service";
import gracefulShutdown from "./services/shutdown.service";

const port = process.env.PORT || 7879;

const startServer = async () => {
  try {
    await connectDatabases();

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    await gracefulShutdown();
  }
};

startServer();
