import { rmSync, cpSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import ts from 'typescript';

// clean bin
rmSync('bin', { recursive: true, force: true });

// build
const configPath = ts.findConfigFile('./', ts.sys.fileExists, 'tsconfig.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, './');
const program = ts.createProgram({
    rootNames: config.fileNames,
    options: config.options
});

// emit step — this transpiles to JS
const emitResult = program.emit();

// copy all other files
function copyNonTS(dir: string) {
    for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const stat = statSync(full);

        if (stat.isDirectory()) {
            copyNonTS(full);
            continue;
        }

        if (!full.match(/\.(ts|js)$/)) {
            const dest = join('bin', relative('src', full));
            mkdirSync(dirname(dest), { recursive: true });
            cpSync(full, dest);
        }
    }
}

copyNonTS('src');