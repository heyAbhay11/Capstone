import { Router } from "express";
import agent from "../agents/code.agent.js";


const agentRouter = Router()

agentRouter.post("/invoke", async (req, res) => {
    try {
        const { messages, projectId } = req.body

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        });


        const response = await agent.stream(
            { messages },
            { context: { projectid: projectId }, streamMode: "custom" }
        )

        for await (const chunk of response) {    //for await is a loop genrally use for streaming
            console.log(chunk)
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        res.json({ response })
    }
    catch (error) {
        console.error("Error invoking agent:", error)
        res.status(500).json({ error: "Failed to invoke agent" })
    }
})




export default agentRouter