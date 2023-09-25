const { readFile } = require('node:fs/promises');

const readKeywordsFile = async (keywordsFilePath) => {
    const data = await readFile(keywordsFilePath);
    return data.toString().split("\r\n")
        .filter((keyword) => !!keyword)
        .map((keyword) => keyword.toUpperCase());
}

module.exports = readKeywordsFile;
