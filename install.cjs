const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    // Only fixed npm/npx commands use the Windows shell; paths go through cwd.
    shell: process.platform === 'win32' && ['npm', 'npx'].includes(command),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed.`);
  return capture ? result.stdout.trim() : '';
}

function main() {
  const input = process.env.GIT_RULES_TARGET || process.argv[2];
  if (!input) throw new Error('Usage: node install.cjs <project-folder> [--files-only]');
  const target = fs.realpathSync(path.resolve(input.replace(/^"|"$/g, '')));
  if (!fs.statSync(target).isDirectory()) throw new Error('Target must be a folder.');
  const filesOnly = process.argv.includes('--files-only');
  const sourcePackage = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  const packageFile = path.join(target, 'package.json');
  const pkg = fs.existsSync(packageFile)
    ? JSON.parse(fs.readFileSync(packageFile, 'utf8').replace(/^\uFEFF/, ''))
    : { private: true };
  run('git', ['--version'], target, true);
  if (!filesOnly) run('npm', ['--version'], target, true);

  // Do not accidentally configure a parent repository from a nested directory.
  const root = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: target, encoding: 'utf8' });
  if (root.status === 0) {
    const actualRoot = fs.realpathSync(root.stdout.trim());
    const normalize = value => process.platform === 'win32' ? value.toLowerCase() : value;
    if (normalize(actualRoot) !== normalize(target)) {
      throw new Error(`Choose the Git repository root: ${actualRoot}`);
    }
  } else {
    run('git', ['init'], target);
  }

  const backupDir = path.join(target, '.git-rules-backups', `${Date.now()}-${process.pid}`);
  function write(relative, contents) {
    const destination = path.join(target, relative);
    if (fs.existsSync(destination)) {
      if (fs.readFileSync(destination, 'utf8') === contents) return;
      const backup = path.join(backupDir, relative);
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.copyFileSync(destination, backup);
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, contents, 'utf8');
    console.log(`Updated ${relative}`);
  }

  pkg.scripts ||= {};
  const prepare = pkg.scripts.prepare || '';
  if (!/(^|&&|;)\s*(?:npx\s+)?husky(?:\s+install)?\s*(?=$|&&|;)/.test(prepare)) {
    pkg.scripts.prepare = prepare ? `${prepare} && husky` : 'husky';
  }
  pkg.devDependencies ||= {};
  for (const [name, version] of Object.entries(sourcePackage.devDependencies)) {
    // Install the versions this configuration was written for.
    if (pkg.dependencies && Object.hasOwn(pkg.dependencies, name)) {
      pkg.dependencies[name] = version;
    } else {
      pkg.devDependencies[name] = version;
    }
  }
  write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
  // .cjs also works in projects that declare "type": "module".
  write('commitlint.config.cjs', fs.readFileSync(path.join(__dirname, 'commitlint.config.js'), 'utf8'));
  const hookFile = path.join(target, '.husky', 'commit-msg');
  const oldHook = fs.existsSync(hookFile) ? fs.readFileSync(hookFile, 'utf8') : '#!/bin/sh\n';
  const command = 'npx --no -- commitlint --config commitlint.config.cjs --edit "$1"';
  if (!oldHook.includes(command)) {
    // Run validation first so an existing hook's `exit` cannot skip it.
    const body = oldHook.replace(/^#![^\n]*(?:\n|$)/, '').replace(/\r\n/g, '\n');
    write('.husky/commit-msg', `#!/bin/sh\n${command} || exit $?\n${body}`);
  }
  const ignoreFile = path.join(target, '.gitignore');
  let ignore = fs.existsSync(ignoreFile) ? fs.readFileSync(ignoreFile, 'utf8') : '';
  for (const entry of ['node_modules/', '.git-rules-backups/']) {
    if (!ignore.split(/\r?\n/).includes(entry)) ignore += `${ignore && !ignore.endsWith('\n') ? '\n' : ''}${entry}\n`;
  }
  write('.gitignore', ignore);
  if (fs.existsSync(backupDir)) console.log(`Original files backed up to: ${backupDir}`);
  if (filesOnly) {
    console.log('Files prepared. Run npm install and npx --no -- husky to activate hooks.');
    return;
  }
  run('npm', ['install', '--include=dev'], target);
  run('npx', ['--no', '--', 'husky'], target);
  console.log(`Git rules installed successfully in: ${target}`);
}

try {
  main();
} catch (error) {
  console.error(`Installation failed: ${error.message}`);
  process.exitCode = 1;
}
