import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  addMember,
  createProject,
  deleteProject,
  getProjectById,
  listProjects,
  removeMember,
  updateProject,
} from "../controllers/project.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", listProjects);
router.post("/", createProject);
router.get("/:id", getProjectById);
router.patch("/:id", updateProject);
router.delete("/:id", deleteProject);
router.post("/:id/members", addMember);
router.delete("/:id/members/:userId", removeMember);

export default router;
