import express from 'express'
import morgan from 'morgan'
import fs from 'fs'
import path from 'path'

const WORKING_DIR = '/workspace'

const app = express();

const isWithinWorkingDir = (baseDir, filePath) => {
    const relativePath = path.relative(baseDir, filePath);
    return relativePath === '' ||
        (relativePath !== '..' &&
            !relativePath.startsWith(`..${path.sep}`) &&
            !path.isAbsolute(relativePath));
}

const resolveWorkspaceFile = async (file, allowMissing = false) => {
    if (typeof file !== 'string' || file.trim() === '' || path.isAbsolute(file)) {
        throw new Error('File path must be a non-empty relative path');
    }

    const baseDir = await fs.promises.realpath(WORKING_DIR);
    const candidatePath = path.resolve(baseDir, file);
    if (!isWithinWorkingDir(baseDir, candidatePath)) {
        throw new Error('File path is outside the working directory');
    }

    let fileStat;
    try {
        fileStat = await fs.promises.lstat(candidatePath);
    } catch (err) {
        if (!allowMissing || err.code !== 'ENOENT') {
            throw err;
        }
    }

    if (fileStat) {
        const realPath = await fs.promises.realpath(candidatePath);
        if (!isWithinWorkingDir(baseDir, realPath)) {
            throw new Error('File path is outside the working directory');
        }
        return realPath;
    }

    const realParentPath = await fs.promises.realpath(path.dirname(candidatePath));
    if (!isWithinWorkingDir(baseDir, realParentPath)) {
        throw new Error('File path is outside the working directory');
    }
    return path.join(realParentPath, path.basename(candidatePath));
}

app.use(express.json())
app.use(morgan('dev'))
app.use(express.urlencoded({ extended: true }))

app.get('/', (req, res) => {
    res.status(200).json({
        message: "hello from sandbox Agent",
        status: 'success'
    })
})


/**
 * @route GET / lists-files
 * @description Lists all files in the working directory and its subdirectories. Returns a JSON object with the file paths relative to the working directory.exclude directories like node_modules, .git, dist, etc. 
 * 
 * -eg.{
 *      "files":[
 *               "file.txt",
 *                "src/file2.txt",   }
                  "src/subdir/file3.txt
                  ]"
            }
 */
app.get("/list-files", async (req, res) => {

    const listFiles = async (dir, baseDir) => {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        const files = [];

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(baseDir, fullPath);

            // Exclude certain directories
            if (entry.isDirectory() && ['node_modules', '.git', 'dist'].includes(entry.name)) {
                continue;
            }

            if (entry.isDirectory()) {
                files.push(...await listFiles(fullPath, baseDir));
            } else {
                files.push(relativePath);
            }
        }

        return files;
    }

    try {
        const files = await listFiles(WORKING_DIR, WORKING_DIR);
        res.status(200).json({
            message: 'Files listed successfully',
            files,
        });
    } catch (err) {
        res.status(500).json({
            message: `Error listing files: ${err.message}`,
            status: 'error',
        });
    }

})



/**
 * @route GET /read/files
 * @description Reads the content of all files requested in the query parameter 'files' and return their content as a JSON object.
 * - ex. /read-files?files=file1.txt,/src/file2.txt
 */
app.get("/read-files", async (req, res) => {

    const files = req.query.files;

    if (!files) {
        return res.status(400).json({
            message: 'No files specified in query parameter',
            status: 'error',
        });
    }

    const fileList = files.split(',');

    const results = await Promise.all(fileList.map(async (file) => {
        const filePath = path.join(WORKING_DIR, file);
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return {
                [filePath.replace(WORKING_DIR, '')]: content,
            }
        } catch (err) {
            return {
                [filePath.replace(WORKING_DIR, '')]: `Error reading file: ${err.message}`,
            }
        }
    }));

    res.status(200).json({
        message: 'File contents',
        files: results,
    });

})



/**
 * @route PATCH / update-files
 *@description updates the content of the files specalized in the request body. the request body should contain a property 'updates' with a JSON array of object, each object have a 'file' property specifying the file path (relative to the working directory) and a 'content property specifying  the new content for the file. 
*/
app.patch("/update-files", async (req, res) => {

    console.log("1. PATCH API HIT");

    try {

        const updates = req.body.updates;

        console.log("2. Request body received:", updates);

        if (!updates || !Array.isArray(updates)) {
            return res.status(400).json({
                message: "Invalid updates array",
                status: "error"
            });
        }

        const results = await Promise.all(
            updates.map(async (update) => {

                console.log("3. Processing file:", update.file);

                const { file, content } = update;

                const filePath = path.join(WORKING_DIR, file);

                console.log("4. Creating directory");

                await fs.promises.mkdir(
                    path.dirname(filePath),
                    { recursive: true }
                );

                console.log("5. Writing file");

                await fs.promises.writeFile(
                    filePath,
                    content,
                    "utf-8"
                );

                console.log("6. File written successfully");

                return {
                    [filePath]: "File updated successfully"
                };

            })
        );

        console.log("7. Sending response");

        return res.status(200).json({
            message: "File update results",
            results
        });

    } catch (err) {

        console.error("PATCH ERROR:", err);

        return res.status(500).json({
            message: err.message,
            status: "error"
        });

    }

});


/**
 * @route POST / create-files
 * @description Creates new files with the content specified in the request body. The request body should contain property 'files' with a JSON Array of objects, each object should have a 'file ' property specifying the file path  [relative to the working directory] and a 'content' property specifying the content fot the new file.
  */
app.post("/create-files", async (req, res) => {
    const files = req.body.files;

    if (!files || !Array.isArray(files)) {
        return res.status(400).json({
            message: 'Invalid request body. Expected a JSON object with a "files" property containing an array of file objects.',
            status: 'error',
        });
    }

    const results = await Promise.all(files.map(async (fileObj) => {
        const { file, content } = fileObj;
        const filePath = path.join(WORKING_DIR, file);
        try {

            await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
            await fs.promises.writeFile(filePath, content, 'utf-8');
            return {
                [filePath]: 'File created successfully',
            }
        } catch (err) {
            return {
                [filePath]: `Error creating file: ${err.message}`,
            }
        }
    }));

    res.status(200).json({
        message: 'File creation results',
        results,
    });
})

export default app
