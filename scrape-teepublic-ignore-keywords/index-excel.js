const cheerio = require('cheerio');
const { appendFile, writeFile } = require('node:fs/promises');
const concatCSVAndOutput = require('./utils/concatCSVAndOutput');
const readKeywordsFile = require('./utils/readKeywordsFile');
const url = 'https://www.teepublic.com/user/cidolopez/stickers?page={{PLACEHOLDER}}';

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

let keywords = [];
let violated = 0;
let violatedAnalytics = {};

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
    const outputFilePath = `list-${from}-${to}-${time}.csv`;
    await writeFile(outputFilePath, 'sep=;\n');
    await appendFile(outputFilePath, 'Name;Link\n');
    keywords = await readKeywordsFile('./keywords.csv');
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
        await concatCSVAndOutput(fileNames, outputFilePath);
        if (promisesList.length !== 0) {
            console.log(`Done from ${from + i * 100} to ${end}`);
        }
        promisesList.length = 0;
        fileNames.length = 0;
    }

    Object.keys(violatedAnalytics)
        .sort((a, b) => violatedAnalytics[a] - violatedAnalytics[b])
        .forEach((key) => {
            const time = `${violatedAnalytics[key]} time(s)`;
            const spaceBufferLength = 100 - key.length - time.length;
            console.log(`${key}${Array(spaceBufferLength).fill(' ').join('')}${violatedAnalytics[key]} time(s)`);
        });

    const totalText = `Violated titles:`;
    const totalViolatedTimes = `${violated} time(s)`;
    console.log(`${totalText}${Array(100 - totalText.length - totalViolatedTimes.length).fill(' ').join('')}${totalViolatedTimes}`);
}

async function getSinglePage(page) {
    return await fetch(getUrl(page), {
        headers: {
            'Cookie': '_session_id=954ee52b061f327df6a2f1d6970f3383; csrf_token=A%2FNCcB76XbLcH2mqEgEuHsqawcgZGnUnjt4LIGA7ax3F65u%2Ftf03a5Jw9SkIuju2OXXowy29pRsc6jFMde1TOQ%3D%3D',
        }
    }).then(response => response.text()).then(async html => {
        const $ = cheerio.load(html);
        const jsDesignContainers = Array.from($('.m-tiles__tile.jsDesignContainer'));
        jsDesignContainers.forEach(async (element) => {
            let title = element.attribs['data-gtm-design-title'];
            if (checkIncludeKeywords(title)) {
                await appendFile(`list-${page}.csv`, `${title};${element.attribs['data-image-url']}\n`);
            }
        });
        console.log(`Page: ${page}, Number of designs: ${imageTagList.length}`);
    });
}

function checkIncludeKeywords(title) {
    const upperCasedTitle = title.toUpperCase();
    for (const keyword of keywords) {
        if (keyword.includes(' ')) {
            if (upperCasedTitle.includes(keyword)) {
                console.log(`${title} matched ${keyword}`);
                violated++;
                if (violatedAnalytics[keyword]) {
                    violatedAnalytics[keyword]++;
                } else {
                    violatedAnalytics[keyword] = 1;
                }
                return false;
            }
        } else {
            if (upperCasedTitle.split(' ').includes(keyword)) {
                console.log(`${title} matched ${keyword}`);
                violated++;
                if (violatedAnalytics[keyword]) {
                    violatedAnalytics[keyword]++;
                } else {
                    violatedAnalytics[keyword] = 1;
                }
                return false;
            }
        }

    }
    return true;
}

scrapeData(from, to);
