const { Task, WorkspaceMember } = require("../models/index");

function normalizeProgressByStatus(status, actualProgress) {
    if (status === "done") {
        return 100;
    }

    if (status === "todo") {
        return 0;
    }

    return actualProgress;
}

async function createTaskService(workspaceId, title, description, status, actualProgress, assigneeUserId, projectId, milestoneId, dueDate, userId) {
    const isMember = await WorkspaceMember.findOne({
        workspaceId,
        userId
    });

    if (!isMember) {
        return { statuscode: 403, data: null };
    }

    const parsedProgress = actualProgress === undefined ? 0 : Number(actualProgress);
    if (Number.isNaN(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
        return { statuscode: 400, data: null };
    }

    const finalProgress = normalizeProgressByStatus(status, parsedProgress);

    const data = await Task.create({ workspaceId, title, description, status, actualProgress: finalProgress, assigneeUserId, projectId, milestoneId, dueDate, createdBy: userId });

    return { statuscode: 201, data: data };
}

async function updateTaskService(taskId, userId, body) {
    if (!userId) {
        return { statuscode: 400, data: null };
    }

    const task = await Task.findById(taskId, { createdBy: 1 });

    if (!task) {
        return { statuscode: 404, data: null };
    }

    if (task.createdBy.toString() !== userId.toString()) {
        return { statuscode: 403, data: null };
    }

    if (body.actualProgress !== undefined) {
        const parsedProgress = Number(body.actualProgress);
        if (Number.isNaN(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
            return { statuscode: 400, data: null };
        }
        body.actualProgress = parsedProgress;
    }

    if (body.status !== undefined && (body.actualProgress !== undefined || body.status === "todo" || body.status === "done")) {
        body.actualProgress = normalizeProgressByStatus(body.status, body.actualProgress);
    }

    const data = await Task.updateOne(
        { _id: taskId },
        { $set: body }
    );

    return { statuscode: 200, data };
}

async function taskDeleteService(taskId, userId) {
    const task = await Task.findById(taskId, { createdBy: 1 });

    if (!task) {
        return { statuscode: 404, data: null };
    }

    if (task.createdBy.toString() !== userId.toString()) {
        return { statuscode: 403, data: null };
    }

    const data = await Task.deleteOne({ _id: taskId });
    return { statuscode: 200, data: data };
}

async function taskGetByIdService(taskId) {
    const data = await Task.findById({
        _id: taskId
    });

    return { statuscode: 200, data };
}

async function taskGetAllService(projectId) {
    const data = await Task.find({
        projectId: projectId
    });

    return { statuscode: 200, data };
}

async function taskFilterService(status, userid) {
    const data = await Task.find({
        status: status,
        assigneeUserId: userid
    });

    return { statuscode: 200, data };
}

module.exports = {
    createTaskService,
    updateTaskService,
    taskDeleteService,
    taskGetByIdService,
    taskGetAllService,
    taskFilterService
}

