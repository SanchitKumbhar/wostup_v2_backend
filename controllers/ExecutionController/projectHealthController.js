const async_handler=require("express-async-handler");
const projectHealthService=require("../../services/projectHealthService")
const projectHealthController=async_handler(async(req,res)=>{
    // workspaceid
    console.log(req.params.workspaceId)
    await projectHealthService.projectHealthService(req.params.workspaceId)

    return res.status(200).json({
        msg:"test"
    })
})

module.exports = projectHealthController;