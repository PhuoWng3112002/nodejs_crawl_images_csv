const { appendFile, readFile, unlink } = require('node:fs/promises');

async function concatCSVAndOutput(csvFilePaths, outputFilePath) {
    csvFilePaths.reduce(async (pre, csvFilePath) => {
        try {
            const data = await readFile(csvFilePath);
            await appendFile(outputFilePath, data);
            await unlink(csvFilePath);
        } catch (error) {
            console.log(error);
            return null;
        }
    }, null);
}

module.exports = concatCSVAndOutput;
