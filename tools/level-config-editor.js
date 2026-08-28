#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LEVELS_ROOT = path.resolve(__dirname, '..', 'assets', 'resources', 'levels');
const FIELD_DEFINITIONS = {
    gridColumnCount: { type: 'number', min: 1 },
    gridRowCount: { type: 'number', min: 1 },
    gridCellWidth: { type: 'number', min: 1 },
    gridCellHeight: { type: 'number', min: 1 },
    imageId: { type: 'string' },
    gameMode: { type: 'string' },
    pieceColumns: { type: 'number', min: 1 },
    pieceRows: { type: 'number', min: 1 },
    snapThreshold: { type: 'number', min: 0 },
    minPieceSize: { type: 'number', min: 1 },
    maxPieceSize: { type: 'number', min: 1 },
    crossingThresholdFraction: { type: 'number', min: 0, max: 1 },
    mergeEnabled: { type: 'boolean' },
    allowDisconnectedShapeCells: { type: 'boolean' },
    rewardCoins: { type: 'number', min: 0 },
};

function printUsage() {
    console.log(`Usage:
  node tools/level-config-editor.js --region 2 --set gridColumnCount=8 --set maxPieceSize=3 --preview
  node tools/level-config-editor.js --from 26 --to 50 --set rewardCoins=15 --apply
  node tools/level-config-editor.js --regions 2,3,5 --set mergeEnabled=false --apply --backup

Selectors:
  --region <n>            Target one region
  --regions <n,n>         Target multiple regions
  --from <n>              Minimum level number
  --to <n>                Maximum level number

Actions:
  --set <key=value>       Apply a safe field change. Repeat as needed.
  --apply                 Write changes to disk
  --backup                Create .bak files before writing
  --preview               Explicit preview (default if --apply is not set)
  --help                  Show this message

Allowed fields:
  ${Object.keys(FIELD_DEFINITIONS).join(', ')}
`);
}

function parseNumeric(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        throw new Error(`Field "${fieldName}" must be numeric, received: ${value}`);
    }
    return parsed;
}

function parseBoolean(value, fieldName) {
    if (value === true || value === false) {
        return value;
    }

    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true') {
        return true;
    }
    if (normalized === 'false') {
        return false;
    }

    throw new Error(`Field "${fieldName}" must be boolean, received: ${value}`);
}

function parseSetArgument(token) {
    const separatorIndex = token.indexOf('=');
    if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
        throw new Error(`Invalid --set value: ${token}. Expected key=value.`);
    }

    const key = token.slice(0, separatorIndex).trim();
    const rawValue = token.slice(separatorIndex + 1).trim();

    if (!Object.prototype.hasOwnProperty.call(FIELD_DEFINITIONS, key)) {
        throw new Error(`Field "${key}" is not allowed for bulk edit. Allowed fields: ${Object.keys(FIELD_DEFINITIONS).join(', ')}`);
    }

    const definition = FIELD_DEFINITIONS[key];
    let parsedValue;

    if (definition.type === 'number') {
        parsedValue = parseNumeric(rawValue, key);
        if (Number.isFinite(definition.min) && parsedValue < definition.min) {
            throw new Error(`Field "${key}" must be >= ${definition.min}.`);
        }
        if (Number.isFinite(definition.max) && parsedValue > definition.max) {
            throw new Error(`Field "${key}" must be <= ${definition.max}.`);
        }
    } else if (definition.type === 'boolean') {
        parsedValue = parseBoolean(rawValue, key);
    } else if (definition.type === 'string') {
        parsedValue = rawValue;
    } else {
        throw new Error(`Unsupported field type for "${key}".`);
    }

    return { key, value: parsedValue };
}

function collectRegionDirectories() {
    if (!fs.existsSync(LEVELS_ROOT)) {
        throw new Error(`Levels root not found: ${LEVELS_ROOT}`);
    }

    const entries = fs.readdirSync(LEVELS_ROOT, { withFileTypes: true });
    return entries
        .filter((entry) => entry.isDirectory() && /^region-\d+$/.test(entry.name))
        .map((entry) => {
            const match = entry.name.match(/^(?:region-)(\d+)$/);
            return Number(match[1]);
        })
        .sort((a, b) => a - b);
}

function fileMatchesLevelPattern(fileName) {
    return /^level-\d+\.json$/.test(fileName);
}

function parseLevelNumberFromPath(filePath) {
    const fileName = path.basename(filePath);
    const match = fileName.match(/^level-(\d+)\.json$/);
    if (!match) {
        return null;
    }
    return Number(match[1]);
}

function parseRegionFromPath(filePath) {
    const relativePath = path.relative(LEVELS_ROOT, filePath).replace(/\\/g, '/');
    const match = relativePath.match(/^region-(\d+)\//);
    if (!match) {
        return null;
    }
    return Number(match[1]);
}

function normalizeRegionInput(rawValue) {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
        return [];
    }

    return String(rawValue)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value));
}

function getTargetLevelFiles(selectedRegions, fromLevel, toLevel) {
    const levelFiles = [];
    const regionDirectories = collectRegionDirectories();

    const allowedRegions = selectedRegions.length > 0
        ? new Set(selectedRegions)
        : null;

    for (const regionNumber of regionDirectories) {
        if (allowedRegions && !allowedRegions.has(regionNumber)) {
            continue;
        }

        const regionDirectory = path.join(LEVELS_ROOT, `region-${regionNumber}`);
        if (!fs.existsSync(regionDirectory)) {
            continue;
        }

        const files = fs.readdirSync(regionDirectory, { withFileTypes: true })
            .filter((entry) => entry.isFile() && fileMatchesLevelPattern(entry.name))
            .map((entry) => path.join(regionDirectory, entry.name));

        for (const filePath of files) {
            const levelNumber = parseLevelNumberFromPath(filePath);
            const region = parseRegionFromPath(filePath);
            if (levelNumber === null || region === null) {
                continue;
            }

            const inRange = (fromLevel === null || levelNumber >= fromLevel) && (toLevel === null || levelNumber <= toLevel);
            if (!inRange) {
                continue;
            }

            levelFiles.push({ filePath, levelNumber, region });
        }
    }

    levelFiles.sort((left, right) => left.levelNumber - right.levelNumber);
    return levelFiles;
}

function parseArgs(argv) {
    const options = {
        regions: [],
        from: null,
        to: null,
        apply: false,
        preview: false,
        backup: false,
        sets: {},
    };

    for (let index = 0; index < argv.length; index += 1) {
        const current = argv[index];

        if (current === '--help' || current === '-h') {
            options.help = true;
            continue;
        }

        if (current === '--region') {
            const nextValue = argv[index + 1];
            if (!nextValue) {
                throw new Error('Missing value for --region');
            }
            options.regions.push(...normalizeRegionInput(nextValue));
            index += 1;
            continue;
        }

        if (current === '--regions') {
            const nextValue = argv[index + 1];
            if (!nextValue) {
                throw new Error('Missing value for --regions');
            }
            options.regions.push(...normalizeRegionInput(nextValue));
            index += 1;
            continue;
        }

        if (current === '--from') {
            const nextValue = argv[index + 1];
            if (!nextValue) {
                throw new Error('Missing value for --from');
            }
            options.from = Number(nextValue);
            index += 1;
            continue;
        }

        if (current === '--to') {
            const nextValue = argv[index + 1];
            if (!nextValue) {
                throw new Error('Missing value for --to');
            }
            options.to = Number(nextValue);
            index += 1;
            continue;
        }

        if (current === '--set' || current === '--field') {
            const nextValue = argv[index + 1];
            if (!nextValue) {
                throw new Error('Missing value for --set');
            }
            const parsed = parseSetArgument(nextValue);
            options.sets[parsed.key] = parsed.value;
            index += 1;
            continue;
        }

        if (current === '--apply') {
            options.apply = true;
            continue;
        }

        if (current === '--preview') {
            options.preview = true;
            continue;
        }

        if (current === '--backup') {
            options.backup = true;
            continue;
        }

        if (current.startsWith('--')) {
            throw new Error(`Unknown option: ${current}`);
        }

        throw new Error(`Unexpected positional argument: ${current}`);
    }

    if (options.help) {
        printUsage();
        process.exit(0);
    }

    if (Object.keys(options.sets).length === 0) {
        throw new Error('No field updates provided. Use --set key=value at least once.');
    }

    if (options.from !== null && options.to !== null && options.from > options.to) {
        throw new Error('Range is invalid: --from must be <= --to.');
    }

    if (options.regions.length === 0 && options.from === null && options.to === null) {
        throw new Error('No target selector specified. Use --region(s), --from/--to, or both.');
    }

    if (!options.apply) {
        options.preview = true;
    }

    return options;
}

function createBackup(filePath) {
    const backupPath = `${filePath}.bak`;
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
}

function applyChangesToFile(filePath, changes, opts) {
    const contents = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(contents);

    const originalSnapshot = JSON.parse(JSON.stringify(json));
    let changedCount = 0;

    for (const [field, value] of Object.entries(changes)) {
        if (!Object.prototype.hasOwnProperty.call(json, field)) {
            json[field] = value;
        }

        const previousValue = json[field];
        if (previousValue !== value) {
            json[field] = value;
            changedCount += 1;
        }
    }

    if (changedCount === 0) {
        return {
            filePath,
            changed: false,
            before: originalSnapshot,
            after: json,
        };
    }

    if (opts.apply) {
        if (opts.backup) {
            createBackup(filePath);
        }
        fs.writeFileSync(filePath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
    }

    return {
        filePath,
        changed: true,
        before: originalSnapshot,
        after: json,
    };
}

function main() {
    try {
        const args = parseArgs(process.argv.slice(2));
        const targetRegions = args.regions.length > 0 ? [...new Set(args.regions)] : [];
        const targetFiles = getTargetLevelFiles(targetRegions, args.from, args.to);

        if (targetFiles.length === 0) {
            console.log('No levels matched the selected filters.');
            return;
        }

        const results = [];
        for (const { filePath, levelNumber, region } of targetFiles) {
            const result = applyChangesToFile(filePath, args.sets, { apply: args.apply, backup: args.backup });
            results.push({ filePath, levelNumber, region, result });
        }

        const changedFiles = results.filter(({ result }) => result.changed);
        const unchangedFiles = results.filter(({ result }) => !result.changed);

        console.log(`Matched levels: ${results.length}`);
        console.log(`Changed levels: ${changedFiles.length}`);
        console.log(`Unchanged levels: ${unchangedFiles.length}`);

        if (changedFiles.length === 0) {
            console.log('No level config changes were required.');
            return;
        }

        for (const { filePath, levelNumber, region, result } of changedFiles) {
            console.log(`\n[${region}] level-${levelNumber}`);
            console.log(`  ${path.relative(process.cwd(), filePath)}`);
            for (const [field, value] of Object.entries(args.sets)) {
                const beforeValue = result.before[field];
                const afterValue = result.after[field];
                if (beforeValue !== afterValue) {
                    console.log(`  ${field}: ${JSON.stringify(beforeValue)} -> ${JSON.stringify(afterValue)}`);
                }
            }
        }

        if (!args.apply) {
            console.log('\nPreview only. Add --apply to write changes to disk.');
        } else {
            console.log('\nChanges saved to disk.');
        }
    } catch (error) {
        console.error(`Error: ${error.message}`);
        printUsage();
        process.exit(1);
    }
}

main();
