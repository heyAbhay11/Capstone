import dotenv from "dotenv/config";
import { ChatGoogle } from "@langchain/google"
import {listFiles, readFile,updateFile} from "./tools.js"
import {createAgent} from "langchain"


const model = new ChatGoogle({
    model: "gemini-3.1-flash-lite",
    apiKey: process.env.GEMINI_API_KEY,
})

const agent = createAgent({
    model,
    tools: [listFiles, readFile, updateFile],
})

await agent.invoke({
    messages: [
        {
            role: "user",
            content: "Create simple snake game in the project using react and css."
        }
    ]
})