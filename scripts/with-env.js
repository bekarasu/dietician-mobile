#!/usr/bin/env node
/*
 * Runs an Expo command against exactly one env file, picked by name from
 * package.json "config.envs", and prints which file and URLs it used.
 *
 *   node scripts/with-env.js <env> -- <command> [args...]
 *   node scripts/with-env.js --check
 *
 * Expo reads env files on its own in two places, which is how a Release build
 * once shipped the LAN URLs from .env.local instead of the production ones:
 * - Expo CLI loads .env, .env.local, .env.<mode> and .env.<mode>.local, and
 *   .env.local wins over .env.production.
 * - In development, expo/virtual/env merges .env, .env.local, .env.development
 *   and .env.development.local over process.env, so they beat any value set
 *   here, and EXPO_NO_DOTENV does not stop it.
 * So env files use names Expo ignores (.env.dev, .env.prod, .env.lan), this
 * script refuses to run while a reserved name exists, and EXPO_NO_DOTENV is set
 * for good measure.
 */
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');

const ROOT = path.resolve(__dirname, '..');
const { config } = require('../package.json');

const RESERVED_ENV_FILES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
  '.env.production',
  '.env.production.local',
];

// Gradle re-bundles a release build only when a JS or TS file under the
// project changes, so without this an env switch reuses the previous bundle.
const STAMP_FILE = path.join(ROOT, '.expo', 'app-env.js');

const color = (code) => (text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
const bold = color('1');
const dim = color('2');
const red = color('31');
const green = color('32');
const yellow = color('33');

function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--check') {
    process.exit(checkAll() ? 0 : 1);
  }

  const separator = args.indexOf('--');
  const envName = args[0];
  const command = separator === -1 ? [] : args.slice(separator + 1);

  if (!envName || envName.startsWith('-') || command.length === 0) {
    fail(`Usage: node scripts/with-env.js <${Object.keys(config.envs).join('|')}> -- <command> [args...]`);
  }

  const env = loadEnv(envName);
  const build = describeCommand(command);
  const problems = [...reservedFileProblems(), ...env.problems, ...releaseProblems(env, build)];

  printBanner(env, build);

  for (const { level, message } of problems) {
    console.log(`${level === 'error' ? red('error') : yellow('warn ')} ${message}`);
  }
  if (problems.some((problem) => problem.level === 'error')) {
    process.exit(1);
  }
  console.log('');

  const meta = {
    EXPO_PUBLIC_APP_ENV: env.name,
    EXPO_PUBLIC_ENV_FILE: env.file,
    EXPO_PUBLIC_MONITORING: String(env.monitoring),
    EXPO_PUBLIC_BUILD_TIME: new Date().toISOString(),
    EXPO_PUBLIC_GIT_COMMIT: gitCommit(),
  };
  writeStamp(meta);

  // The file wins over the shell, so an exported variable cannot leak in.
  const childEnv = {
    ...process.env,
    ...env.vars,
    ...meta,
    EXPO_NO_DOTENV: '1',
    PATH: `${path.join(ROOT, 'node_modules', '.bin')}${path.delimiter}${process.env.PATH}`,
  };

  const child = spawn(command[0], command.slice(1), { cwd: ROOT, env: childEnv, stdio: 'inherit' });
  // Ctrl+C reaches the child too; wait for it to shut down instead of dying first.
  process.on('SIGINT', () => {});
  // A signal sent to this process alone would otherwise orphan the child.
  for (const signal of ['SIGTERM', 'SIGHUP']) {
    process.on(signal, () => child.kill(signal));
  }
  child.on('error', (error) => fail(`Could not start ${command[0]}: ${error.message}`));
  child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}

function loadEnv(name) {
  const definition = config.envs[name];
  if (!definition) {
    fail(`Unknown env "${name}". Defined in package.json "config.envs": ${Object.keys(config.envs).join(', ')}`);
  }

  const env = { name, file: definition.file, monitoring: Boolean(definition.monitoring), vars: {}, problems: [] };
  const filePath = path.join(ROOT, definition.file);

  if (!fs.existsSync(filePath)) {
    env.problems.push({ level: 'error', message: `${definition.file} does not exist. Copy .env.example to create it.` });
    return env;
  }

  env.vars = parseEnv(fs.readFileSync(filePath, 'utf8'));

  for (const key of config.requiredEnv) {
    if (!env.vars[key]) {
      env.problems.push({ level: 'error', message: `${key} is missing in ${definition.file}` });
    }
  }
  for (const [key, value] of urlEntries(env.vars)) {
    if (!URL.canParse(value)) {
      env.problems.push({ level: 'error', message: `${key} in ${definition.file} is not a valid URL` });
    }
  }
  return env;
}

function urlEntries(vars) {
  return Object.entries(vars).filter(([key, value]) => key.endsWith('_URL') && value);
}

// Release builds have no cleartext exception: Android's is only in the debug
// manifests, and iOS ATS allows HTTP to the local network only.
function releaseProblems(env, build) {
  if (!build.release) {
    return [];
  }
  const httpKeys = urlEntries(env.vars)
    .filter(([, value]) => value.startsWith('http://'))
    .map(([key]) => key);
  if (httpKeys.length === 0) {
    return [];
  }
  return build.platform === 'android'
    ? [{ level: 'error', message: `Android release builds block plain HTTP: ${httpKeys.join(', ')}` }]
    : [
        {
          level: 'warn',
          message: `HTTP in a Release build only reaches the local network, and only with the phone on the same Wi-Fi: ${httpKeys.join(', ')}`,
        },
      ];
}

function reservedFileProblems() {
  return RESERVED_ENV_FILES.filter((file) => fs.existsSync(path.join(ROOT, file))).map((file) => ({
    level: 'error',
    message: `${file} would be merged in by Expo behind this script's back. Rename it (envs are listed in package.json "config.envs").`,
  }));
}

function describeCommand(command) {
  const text = command.join(' ');
  const platform = /run:ios/.test(text) ? 'ios' : /run:android/.test(text) ? 'android' : undefined;
  const release =
    (platform === 'ios' && /--configuration[ =]Release/i.test(text)) ||
    (platform === 'android' && /--variant[ =]\S*release/i.test(text));
  return { text, platform, release };
}

function gitCommit() {
  try {
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
    const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: ROOT, encoding: 'utf8' }).trim();
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return 'unknown';
  }
}

function writeStamp(meta) {
  fs.mkdirSync(path.dirname(STAMP_FILE), { recursive: true });
  fs.writeFileSync(
    STAMP_FILE,
    `// Written by scripts/with-env.js on every run. Nothing imports it.\nmodule.exports = ${JSON.stringify(meta, null, 2)};\n`,
  );
}

function printBanner(env, build) {
  const kind = build.platform
    ? `${build.release ? 'Release' : 'Debug'} build, ${build.platform}`
    : 'Metro dev server';
  const rows = [
    ['env', `${bold(env.name)}  ${dim('from')} ${bold(env.file)}`],
    ['target', kind],
    ['monitoring', env.monitoring ? green('on') : dim('off')],
    ...urlEntries(env.vars).map(([key, value]) => [shortKey(key), value.startsWith('http://') ? yellow(value) : value]),
  ];
  console.log('');
  for (const [label, value] of rows) {
    console.log(`  ${dim(label.padEnd(16))}${value}`);
  }
  console.log(`  ${dim('command'.padEnd(16))}${dim(build.text)}`);
  console.log('');
}

// EXPO_PUBLIC_ACCOUNT_API_URL -> ACCOUNT
function shortKey(key) {
  return key.replace(/^EXPO_PUBLIC_/, '').replace(/_API_URL$|_URL$/, '');
}

function checkAll() {
  let ok = true;
  const reserved = reservedFileProblems();

  for (const name of Object.keys(config.envs)) {
    const env = loadEnv(name);
    const httpKeys = urlEntries(env.vars).filter(([, value]) => value.startsWith('http://'));
    const status = env.problems.length ? red('✗') : green('✓');
    const note = httpKeys.length ? yellow('  HTTP: debug builds only') : '';

    console.log(`${status} ${bold(name.padEnd(6))} ${env.file.padEnd(12)} monitoring ${env.monitoring ? 'on ' : 'off'}${note}`);
    for (const { message } of env.problems) {
      console.log(`    ${red(message)}`);
    }
    ok &&= env.problems.length === 0;
  }

  for (const { message } of reserved) {
    console.log(`${red('✗')} ${message}`);
  }
  return ok && reserved.length === 0;
}

function fail(message) {
  console.error(red(message));
  process.exit(1);
}

main();
