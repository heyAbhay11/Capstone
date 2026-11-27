import axios from "axios";
import { tool } from "langchain"
import * as z from "zod"

export const listFiles = tool(
    async ({ }, runtime) => {

        runtime.writer?.("Listing files in project directory...\n")

       
        const response = await axios.get(`http://sandbox-service-${runtime.context.projectid}:3000/list-files`)

        runtime.writer?.("Files listed successfully. Files: " + response.data.files.join(",") + "\n");

        return JSON.stringify(response.data.files);
    },
    {
        name: "list_files",
        description: "List all the files in the project directory. This is useful for understanding what files are available to work with.",
        schema: z.object({}),
    }
)

export const readFile = tool(
    async ({ files = [] }, runtime) => {

        runtime.writer?.("Reading files in project directory " + files.join(",") + "\n")


        const response = await axios.get(
            `http://sandbox-service-${runtime.context.projectid}:3000/read-files`,
            { params: { files: files.join(",") } }
        )

       runtime.writer?.("Files read successfully.\n")

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
    async ({ files }, runtime) => {

        runtime.writer?.("Update files in project directory..." + files.map(f => f.file).join(",") + "\n")

        const response = await axios.patch(`http://sandbox-service-${runtime.context.projectid}:3000/update-files`, {
            updates: files
        })


       runtime.writer?.("Files update successfully\n");

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


