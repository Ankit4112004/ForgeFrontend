import { Router } from "express";
import { createPod, deletePod, checkPodExists } from '../kubernetes/pod.js';
import { createService, deleteService } from '../kubernetes/service.js';
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

    if (project.sandboxId) {
        const podExists = await checkPodExists(project.sandboxId);
        if (podExists) {
            return res.status(200).json({
                message: 'Sandbox environment already running',
                sandboxId: project.sandboxId,
                previewUrl: `http://${project.sandboxId}.preview.localhost:8080`
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

    if (project.sandboxId) {
        await Promise.all([
            deletePod(project.sandboxId),
            deleteService(project.sandboxId)
        ]).catch(e => console.error("Failed to delete K8s resources:", e));
    }

    return res.status(200).json({
        message: 'Project deleted successfully'
    })
})


export default router;