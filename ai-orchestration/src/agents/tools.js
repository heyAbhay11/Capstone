import axios from "axios";
import { tool } from "langchain"
import * as z from "zod"

export const listFiles = tool(
    async ({ }) => {
        console.log("============================================")
        console.log("using list file tool")
        console.log("============================================")

        const response = await axios.get("http://01a1ce9f-9792-7276-98e9-fc26e1a67096.agent.localhost/list-files")

        console.log("============================================")
        console.log("response from list files tool", response.data)
        console.log("============================================")

        return JSON.stringify(response.data.files);
    },
    {
        name: "list_files",
        description: "List all the files in the project directory. This is useful for understanding what files are available to work with.",
        schema: z.object({}),
    }
)

export const readFile = tool(
    async ({ files }) => {

        console.log("============================================")
        console.log("using list read tool")
        console.log("============================================")


        const response = await axios.get(
            "http://01a1ce9f-9792-7276-98e9-fc26e1a67096.agent.localhost/read-files",
            { params: { files: files.join(",") } }
        )

        console.log("============================================")
        console.log("response from READ files tool", response.data)
        console.log("============================================")

        return JSON.stringify(response.data)
    },
    {
        name: "read_files",
        description: "Read the contents of specified files. this is useful for understanding the content of files that are relevant to the task at hand",
        schema: z.object({
            files: z.array(z.string()).describe("The list of files to read. These should be files that were listed using the list_files tool or created later.")
        })
    }
)


export const updateFile = tool(
    async ({ files }) => {

        console.log("============================================")
        console.log("using list UPDATE tool")
        console.log("============================================")

        const response = await axios.patch("http://01a1ce9f-9792-7276-98e9-fc26e1a67096.agent.localhost/update-files", {
            updates: files
        })

        console.log("============================================")
        console.log("response from UPDATE files tool", response.data)
        console.log("============================================")


        return JSON.stringify(response.data.results);
    },
    {
        name: "update_files",
        description: "update the contents of specified files. This is useful for making changes to files based on the requirements of the task at hand. this tool can also use to create new files by providing a new file name in the file field and the content to be added in the content field.",
        schema: z.object({
            files: z.array(z.object({
                file: z.string().describe("The relative path of the file to update"),
                content: z.string().describe("The new content for the file")
            })).describe("The list of files to update and their new contents")
        })
    }
)
