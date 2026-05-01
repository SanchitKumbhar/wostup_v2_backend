const { Project } = require("../models/index");
const { Task } = require("../models/index");
const mongoose = require("mongoose");

async function projectHealthService(workspaceId) {
    // Convert workspaceId string to ObjectId
    const objectId = new mongoose.Types.ObjectId(workspaceId);
    // calculate the progress score,time score,schedule performance
    //     1. Progress Score
    // Progress = Completed Tasks / Total Tasks
    // = 18 / 24 = 0.75 (75%)
    // 2. Time Score (Very Important)
    // Time Passed = (Total Duration - Days Left) / Total Duration

    // Assume total = 28 days:

    // Time Passed = (28 - 14) / 28 = 0.5 (50%)
    // 3. Schedule Performance (SPI Concept)
    // Schedule Score = Progress / Time Passed
    // = 0.75 / 0.5 = 1.5

    // 👉 Interpretation:

    // > 1 → Ahead of schedule
    // = 1 → On track
    // < 1 → Behind

    // So your project is actually ahead 🚀
    const result = await Project.aggregate([
        {
            $match: {
                workspaceId: objectId,
                deletedAt: null
            }
        },
        {
            $project: {
                name: 1,
                progress: 1,

                totalDuration: {
                    $dateDiff: {
                        startDate: "$createdAt",
                        endDate: "$dueDate",
                        unit: "day"
                    }
                },

                daysRemaining: {
                    $dateDiff: {
                        startDate: new Date(),
                        endDate: "$dueDate",
                        unit: "day"
                    }
                }
            }
        },
        {
            $addFields: {
                timeUsed: { $subtract: ["$totalDuration", "$daysRemaining"] },
            }
        },
        {
            $addFields: {
                timeProgress: {
                    $cond: [
                        { $eq: ["$totalDuration", 0] },
                        0,
                        { $divide: ["$timeUsed", "$totalDuration"] }
                    ]
                }
            }
        },
        {
            $addFields: {
                healthScore: {
                    $cond: [
                        { $eq: ["$timeProgress", 0] },
                        0,
                        { $divide: ["$progress", { $multiply: ["$timeProgress", 100] }] }
                    ]
                }
            }
        },
        {
            $addFields: {
                status: {
                    $switch: {
                        branches: [
                            { case: { $gt: ["$healthScore", 1.1] }, then: "Ahead 🚀" },
                            { case: { $gte: ["$healthScore", 0.9] }, then: "On Track ✅" },
                            { case: { $gte: ["$healthScore", 0.7] }, then: "At Risk ⚠️" }
                        ],
                        default: "Delayed ❌"
                    }
                }
            }
        }
    ]);

    console.log(result);



}

// one moree update  that whenever the task is completed the progress in the project also should be get updateed
module.exports={projectHealthService};