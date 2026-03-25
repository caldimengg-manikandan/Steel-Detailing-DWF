/**
 * ============================================================
 * User Projects Controller
 * ============================================================
 * Routes for regular users — scoped to their assigned projects.
 *
 * Routes:
 *   GET /api/user/projects                  — list my assigned projects
 *   GET /api/user/projects/:projectId       — get one assigned project
 *   GET /api/user/projects/:projectId/drawings — get drawings for project
 */
const Project = require('../models/Project');
const Drawing = require('../models/Drawing');
const DrawingExtraction = require('../models/DrawingExtraction');
const { attachProjectStats } = require('../services/projectStatsService');

/**
 * GET /api/user/projects
 * Returns only projects where the user is in assignments[].
 */
async function listMyProjects(req, res) {
    const userId = req.principal.id;
    const mongoose = require('mongoose');

    let queryUserId = userId;
    if (mongoose.Types.ObjectId.isValid(userId)) {
        queryUserId = new mongoose.Types.ObjectId(userId);
    }

    const projects = await Project
        .find({
            'assignments.userId': queryUserId,
            status: { $ne: 'archived' },   // hide archived by default
        })
        .sort({ updatedAt: -1 });

    const projectsWithStats = await attachProjectStats(projects);
    const result = projectsWithStats.map(p => {
        const assignment = p.assignments.find(
            (a) => a.userId.toString() === userId
        );
        return {
            ...p,
            myPermission: assignment?.permission ?? 'viewer',
        };
    });

    res.json({ count: result.length, projects: result });
}

/**
 * GET /api/user/projects/:projectId
 * req.scopedProject pre-loaded by scopeProjectToUser.
 * req.userPermission set by scopeProjectToUser.
 */
async function getMyProject(req, res) {
    const projectWithStats = await attachProjectStats(req.scopedProject);
    res.json({
        project: {
            ...projectWithStats,
            myPermission: req.userPermission,
        },
    });
}

/**
 * GET /api/user/projects/:projectId/drawings
 * Returns drawings for an assigned project.
 */
async function getProjectDrawings(req, res) {
    const project = req.scopedProject;

    const drawings = await Drawing
        .find({ projectId: project._id })
        .sort({ createdAt: -1 });

    res.json({
        count: drawings.length,
        projectName: project.name,
        permission: req.userPermission,
        drawings,
    });
}

/**
 * PATCH /api/user/projects/:projectId/sequences
 * Updates sequence status. Requires 'editor' permission.
 */
async function updateProjectSequences(req, res) {
    const project = req.scopedProject;
    const { sequences } = req.body;

    if (!sequences || !Array.isArray(sequences)) {
        return res.status(400).json({ error: 'Sequences array is required in request body.' });
    }

    // Update sequences
    project.sequences = sequences;
    await project.save();

    res.json({ 
        message: 'Project sequences updated successfully.',
        project: {
            ...project.toObject(),
            id: project._id,
            myPermission: req.userPermission
        }
    });
}

module.exports = { listMyProjects, getMyProject, getProjectDrawings, updateProjectSequences };
