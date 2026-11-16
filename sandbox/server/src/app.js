import express from 'express'
import morgan from 'morgan'
import { createPod, waitForPodReady } from './kubernetes/pod.js'
import { createService } from './kubernetes/service.js'
import { v7 as uuid } from "uuid"


const app = express()

app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get("/api/sandbox/health", (req, res) => {
    res.status(200).json({
        message: "sandbox server is healthy",
        status: "ok"
    })
})


app.post("/api/sandbox/start", async (req, res) => {
    const sandboxId = uuid();

    try {
        await Promise.all([
            createPod(sandboxId),
            createService(sandboxId)
        ])
        await waitForPodReady(sandboxId)
    } catch (error) {
        console.error(`Failed to start sandbox ${sandboxId}:`, error);
        return res.status(503).json({
            message: "Sandbox failed to become ready",
            sandboxId
        })
    }

    return res.status(201).json({
        message: 'sandbox enviorment created successfully',
        sandboxId,
        previewUrl: `http://${sandboxId}.preview.localhost`
    })
})

export default app