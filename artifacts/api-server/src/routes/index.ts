import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import kisanRouter from "./kisanRoutes.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(kisanRouter);

export default router;
