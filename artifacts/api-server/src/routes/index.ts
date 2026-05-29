import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import kisanRouter from "./kisanRoutes.js";
import settingsRouter, { seedDefaultVillages } from "./settingsRoutes.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(kisanRouter);
router.use(settingsRouter);

void seedDefaultVillages();

export default router;
