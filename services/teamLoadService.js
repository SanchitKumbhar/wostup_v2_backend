const mongoose = require("mongoose");
const { Task, WorkspaceMember, User } = require("../models/index");

function toObjectId(id) {
	if (!mongoose.Types.ObjectId.isValid(id)) {
		return null;
	}

	return new mongoose.Types.ObjectId(id);
}

function parseProjectIds(projectId, projectIds, projects) {
	const rawProjectIds = [];

	if (Array.isArray(projectId)) {
		rawProjectIds.push(...projectId);
	} else if (projectId) {
		rawProjectIds.push(projectId);
	}

	const projectCollection = projectIds ?? projects;
	if (Array.isArray(projectCollection)) {
		rawProjectIds.push(...projectCollection);
	} else if (typeof projectCollection === "string" && projectCollection.trim()) {
		rawProjectIds.push(...projectCollection.split(",").map((id) => id.trim()));
	}

	const uniqueProjectIds = [...new Set(rawProjectIds.filter((id) => Boolean(id)))];
	if (!uniqueProjectIds.length) {
		return { projectObjectIds: [], isValid: true };
	}

	const projectObjectIds = uniqueProjectIds
		.map((id) => toObjectId(id))
		.filter((id) => Boolean(id));

	if (projectObjectIds.length !== uniqueProjectIds.length) {
		return { projectObjectIds: [], isValid: false };
	}

	return { projectObjectIds, isValid: true };
}

async function validateMembership(workspaceId, userId) {
	if (!userId) {
		return true;
	}

	const userObjectId = toObjectId(userId);
	if (!userObjectId) {
		return false;
	}

	const isMember = await WorkspaceMember.findOne({ workspaceId, userId: userObjectId }, { _id: 1 }).lean();
	return Boolean(isMember);
}

function getTaskLoadWeight(task) {
	if (task.status === "done") {
		return 0;
	}

	const now = new Date();
	const dueDate = task.dueDate ? new Date(task.dueDate) : null;
	const actualProgress = Number(task.actualProgress) || 0;
	const remainingWork = Math.max(0, 100 - actualProgress) / 100;

	let urgencyMultiplier = 1;
	if (dueDate && !Number.isNaN(dueDate.getTime())) {
		const msInDay = 24 * 60 * 60 * 1000;
		const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / msInDay);

		if (daysLeft < 0) {
			urgencyMultiplier = 1.7;
		} else if (daysLeft <= 2) {
			urgencyMultiplier = 1.5;
		} else if (daysLeft <= 7) {
			urgencyMultiplier = 1.25;
		}
	}

	if (task.isBlocked) {
		urgencyMultiplier += 0.2;
	}

	return Number((remainingWork * urgencyMultiplier).toFixed(2));
}

async function getTeamLoadService({
	workspaceId,
	projectId,
	projectIds,
	projects,
	memberId,
	memberSearch,
	userId,
}) {
	const workspaceObjectId = toObjectId(workspaceId);
	const memberObjectId = memberId ? toObjectId(memberId) : null;
	const { projectObjectIds, isValid: areProjectIdsValid } = parseProjectIds(projectId, projectIds, projects);

	if (!workspaceObjectId || !areProjectIdsValid || (memberId && !memberObjectId)) {
		return { status: 400, message: "Invalid workspaceId, project filter or memberId" };
	}

	const isMember = await validateMembership(workspaceObjectId, userId);
	if (!isMember) {
		return { status: 403, message: "Only workspace members can access team load" };
	}

	const memberQuery = { workspaceId: workspaceObjectId };
	if (memberObjectId) {
		memberQuery.userId = memberObjectId;
	}

	const workspaceMembers = await WorkspaceMember.find(memberQuery, { userId: 1, role: 1 }).lean();

	if (!workspaceMembers.length) {
		return {
			status: 200,
			data: {
				totalMembers: 0,
				overloadedMembers: 0,
				underloadedMembers: 0,
				averageLoadScore: 0,
				members: [],
			},
		};
	}

	const memberIds = workspaceMembers.map((member) => member.userId);
	const taskQuery = {
		workspaceId: workspaceObjectId,
		deletedAt: null,
		assigneeUserId: { $in: memberIds },
	};

	if (projectObjectIds.length === 1) {
		taskQuery.projectId = projectObjectIds[0];
	} else if (projectObjectIds.length > 1) {
		taskQuery.projectId = { $in: projectObjectIds };
	}

	const tasks = await Task.find(taskQuery, {
		assigneeUserId: 1,
		status: 1,
		dueDate: 1,
		actualProgress: 1,
		isBlocked: 1,
	}).lean();

	const users = await User.find({ _id: { $in: memberIds }, deletedAt: null }, {
		name: 1,
		avatar: 1,
		roleTitle: 1,
		email: 1,
	}).lean();

	let filteredUsers = users;
	const searchValue = typeof memberSearch === "string" ? memberSearch.trim() : "";
	if (searchValue) {
		const searchRegex = new RegExp(searchValue, "i");
		filteredUsers = users.filter((user) => searchRegex.test(user.name || "") || searchRegex.test(user.email || ""));
	}

	const filteredUserIdSet = new Set(filteredUsers.map((user) => user._id.toString()));
	const memberRoleMap = new Map(workspaceMembers.map((member) => [member.userId.toString(), member.role]));

	const memberTaskMap = new Map();
	for (const task of tasks) {
		const assigneeId = task.assigneeUserId?.toString();
		if (!assigneeId || !filteredUserIdSet.has(assigneeId)) {
			continue;
		}

		if (!memberTaskMap.has(assigneeId)) {
			memberTaskMap.set(assigneeId, []);
		}
		memberTaskMap.get(assigneeId).push(task);
	}

	const members = filteredUsers.map((user) => {
		const assigneeId = user._id.toString();
		const memberTasks = memberTaskMap.get(assigneeId) || [];

		const totalAssigned = memberTasks.length;
		const todoCount = memberTasks.filter((task) => task.status === "todo").length;
		const inProgressCount = memberTasks.filter((task) => task.status === "in-progress").length;
		const completedCount = memberTasks.filter((task) => task.status === "done").length;
		const overdueCount = memberTasks.filter((task) => {
			const dueDate = task.dueDate ? new Date(task.dueDate) : null;
			if (!dueDate || Number.isNaN(dueDate.getTime())) {
				return false;
			}
			return task.status !== "done" && dueDate < new Date();
		}).length;

		const loadScore = Number(memberTasks.reduce((sum, task) => sum + getTaskLoadWeight(task), 0).toFixed(2));

		let loadStatus = "balanced";
		if (loadScore >= 8 || inProgressCount >= 6) {
			loadStatus = "overloaded";
		} else if (loadScore <= 2 && totalAssigned <= 2) {
			loadStatus = "underloaded";
		}

		return {
			member: {
				id: user._id,
				name: user.name,
				email: user.email,
				avatar: user.avatar,
				roleTitle: user.roleTitle,
				workspaceRole: memberRoleMap.get(assigneeId) || "member",
			},
			metrics: {
				totalAssigned,
				todoCount,
				inProgressCount,
				completedCount,
				overdueCount,
				loadScore,
				loadStatus,
			},
		};
	});

	const overloadedMembers = members.filter((m) => m.metrics.loadStatus === "overloaded").length;
	const underloadedMembers = members.filter((m) => m.metrics.loadStatus === "underloaded").length;
	const averageLoadScore = members.length
		? Number((members.reduce((sum, m) => sum + m.metrics.loadScore, 0) / members.length).toFixed(2))
		: 0;

	return {
		status: 200,
		data: {
			totalMembers: members.length,
			overloadedMembers,
			underloadedMembers,
			averageLoadScore,
			members,
		},
	};
}

module.exports = {
	getTeamLoadService,
};

