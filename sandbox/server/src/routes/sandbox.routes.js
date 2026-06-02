import { Router } from "express";
import { createPod } from '../kubernetes/pod.js';
import { createService } from '../kubernetes/service.js';
import { createSandboxKey } from '../config/redis.js';
import { v7 as uuid } from "uuid"
import { authMiddleware } from "../middlewares/auth.middleware.js";
import Project from "../models/project.model.js";



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

    const sandboxId = uuid();

    await Promise.all([
        createPod(sandboxId, projectId),
        createService(sandboxId),
        createSandboxKey(sandboxId)
    ]);

    return res.status(201).json({
        message: 'Sandbox environment created successfully',
        sandboxId,
        previewUrl: `http://${sandboxId}.preview.localhost:8080`
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

    return res.status(200).json({
        message: 'Project deleted successfully'
    })
})


export default router;