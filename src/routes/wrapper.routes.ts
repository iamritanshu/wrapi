import { Router } from "express";
import { createWrapper, getWrapper } from "../controllers/wrapper.controller";
import { executeWrapper } from "../controllers/execution.controller";

const router = Router();

router.post("/create", createWrapper);
router.get("/:wrapperId", getWrapper);
router.post("/:wrapperId/:wrapperName", executeWrapper);

export default router;
