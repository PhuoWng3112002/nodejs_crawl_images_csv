const cheerio = require('cheerio');
const { appendFile, readFile, unlink } = require('node:fs/promises');
const concatCSVAndOutput = require('./utils/concatCSVAndOutput');
const url = 'https://www.teepublic.com/user/okdave/stickers?page={{PLACEHOLDER}}';

function getUrl(page) {
    return url.replace('{{PLACEHOLDER}}', page);
}
function getArgs() {
    const args = {};
    process.argv
        .slice(2, process.argv.length)
        .forEach(arg => {
            // long arg
            if (arg.slice(0, 2) === '--') {
                const longArg = arg.split('=');
                const longArgFlag = longArg[0].slice(2, longArg[0].length);
                const longArgValue = longArg.length > 1 ? longArg[1] : true;
                args[longArgFlag] = longArgValue;
            }
            // flags
            else if (arg[0] === '-') {
                const flags = arg.slice(1, arg.length).split('');
                flags.forEach(flag => {
                    args[flag] = true;
                });
            }
        });
    return args;
}

const args = getArgs();

const from = Number(args.from);
const to = Number(args.to);

async function scrapeData(from, to) {
    if (isNaN(from) || isNaN(to)) {
        console.log('Missing from and to');
        return;
    }
    if (to < from) {
        console.log("to can not be smaller than from???");
        return;
    }
    const numberOfPages = to - from + 1;
    const promisesList = [];
    const fileNames = [];
    const numberOfChunks = Math.floor(numberOfPages / 100) + 1;
    const time = Date.now();
    for (let i = 0; i < numberOfChunks; i++) {
        let end = from + i * 100;
        for (let j = 0; j < 100; j++) {
            if (i * 100 + j < numberOfPages) {
                end = from + i * 100 + j;
                promisesList.push(getSinglePage(end));
                fileNames.push(`list-${end}.csv`);
            }
        }
        await Promise.allSettled(promisesList);
        await concatCSVAndOutput(fileNames, `list-${from}-${to}-${time}.csv`);
        if (promisesList.length !== 0) {
            console.log(`Done from ${from + i * 100} to ${end}`);
        }
        promisesList.length = 0;
        fileNames.length = 0;
    }
}

async function getSinglePage(page) {
    return await fetch(getUrl(page), {
        headers: {
            'Cookie': '_session_id=dec343469582e0831cdfb7a7432a9f51; csrf_token=3yMmEQqCA%2FwMRUI9pCvphsWkotCMVd5Lx6ORU5RXHwgxkUbjU3Kv74tmrKxdEm8P7GU%2F0%2FOLX1B3LIeckKU4Mg%3D%3D'
        }
    }).then(response => response.text()).then(async html => {
        const $ = cheerio.load(html);
        const imageTagList = Array.from($('img.cld-hidpi'));
        imageTagList.forEach(async (element) => {
            let title = element.parent?.parent?.parent?.attribs['data-gtm-design-title'];
            await appendFile(`list-${page}.csv`, `"${title}","${element.attribs.src ? element.attribs.src : element.attribs['data-src']}"\n`);
        });
        console.log(`Page: ${page}, Number of designs: ${imageTagList.length}`);
    });
}

scrapeData(from, to);
