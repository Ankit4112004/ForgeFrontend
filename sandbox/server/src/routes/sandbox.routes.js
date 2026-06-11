import { Router } from "express";
import fs from "fs";
import path from "path";
import { createPod, deletePod, checkPodExists } from '../kubernetes/pod.js';
import { createService, deleteService } from '../kubernetes/service.js';
import { createSandboxKey } from '../config/redis.js';
import { v7 as uuid } from "uuid"
import { authMiddleware } from "../middlewares/auth.middleware.js";
import Project from "../models/project.model.js";

// Node-local store where the sync-agent persists each project's files
// (mounted from the same hostPath as the sandbox pods).
const PERSIST_DIR = "/persist";



const router = Router();

router.use(authMiddleware);

router.post('/project', async (req, res) => {
    const { title } = req.body;

    const newProject = new Project({
        user: req.user.id,
        title
    });

    await newProject.save();

    return res.status(201).json({
        message: 'Project created successfully',
        project: newProject
    });
})

router.post("/start", async (req, res) => {

    const projectId = req.body.projectId;

    // Verify that the project belongs to the authenticated user
    const project = await Project.findOne({ _id: projectId, user: req.user.id });

    if (!project) {
        return res.status(404).json({ message: 'Project not found or access denied' });
    }

    if (project.sandboxId) {
        const podExists = await checkPodExists(project.sandboxId);
        if (podExists) {
            return res.status(200).json({
                message: 'Sandbox environment already running',
                sandboxId: project.sandboxId,
                previewUrl: `http://${project.sandboxId}.preview.${process.env.PUBLIC_BASE_HOST || 'localhost:8080'}`
            });
        }
    }

    const sandboxId = uuid();

    await Promise.all([
        createPod(sandboxId, projectId),
        createService(sandboxId),
        createSandboxKey(sandboxId)
    ]);

    project.sandboxId = sandboxId;
    await project.save();

    return res.status(201).json({
        message: 'Sandbox environment created successfully',
        sandboxId,
        previewUrl: `http://${sandboxId}.preview.${process.env.PUBLIC_BASE_HOST || 'localhost:8080'}`
    })
})

router.get("/project", async (req, res) => {
    const projects = await Project.find({ user: req.user.id });

    return res.status(200).json({
        message: 'Projects retrieved successfully',
        projects
    })
})

router.delete("/project/:id", async (req, res) => {
    const projectId = req.params.id;

    // Verify that the project belongs to the authenticated user before deleting
    const project = await Project.findOneAndDelete({ _id: projectId, user: req.user.id });

    if (!project) {
        return res.status(404).json({ message: 'Project not found or access denied' });
    }

    if (project.sandboxId) {
        await Promise.all([
            deletePod(project.sandboxId),
            deleteService(project.sandboxId)
        ]).catch(e => console.error("Failed to delete K8s resources:", e));
    }

    // Remove the project's persisted files from the local store so deleted
    // projects don't leave orphaned data accumulating on disk.
    try {
        const persistedPath = path.join(PERSIST_DIR, projectId);
        await fs.promises.rm(persistedPath, { recursive: true, force: true });
    } catch (e) {
        console.error("Failed to delete persisted project files:", e);
    }

    return res.status(200).json({
        message: 'Project deleted successfully'
    })
})


export default router;