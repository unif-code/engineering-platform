import { lstat, readdir, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ignoredDirectories = new Set([
  '.git',
  '.pnpm-store',
  'coverage',
  'dist',
  'node_modules',
]);

const inlineLinkPattern =
  /!?\[[^\]\n]*\]\(\s*(?:<([^>\n]+)>|([^\s)]+))(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/gu;
const referenceLinkPattern =
  /^\s{0,3}\[[^\]\n]+\]:\s*(?:<([^>\n]+)>|([^\s]+))/u;

const displayPath = (root, path) => relative(root, path).split(sep).join('/');

function isIgnoredDirectory(name) {
  return ignoredDirectories.has(name) || name.startsWith('.umi');
}

async function pathKind(path) {
  try {
    const stats = await lstat(path);
    if (stats.isDirectory()) return 'directory';
    if (stats.isFile()) return 'file';
    return 'other';
  } catch (error) {
    if (error?.code === 'ENOENT') return 'missing';
    throw error;
  }
}

async function collectMarkdownFiles(path, root, files) {
  const kind = await pathKind(path);
  if (kind === 'file') {
    if (path.endsWith('.md')) files.add(path);
    return kind;
  }
  if (kind !== 'directory') return kind;

  const relativePath = relative(root, path);
  if (relativePath !== '' && relativePath.split(sep).some(isIgnoredDirectory)) {
    return kind;
  }

  const entries = await readdir(path, { withFileTypes: true });
  await Promise.all(
    entries.map((entry) => {
      if (entry.isDirectory() && isIgnoredDirectory(entry.name)) {
        return undefined;
      }
      return collectMarkdownFiles(resolve(path, entry.name), root, files);
    }),
  );
  return kind;
}

function maskInlineCode(line) {
  let cursor = 0;
  let output = '';
  while (cursor < line.length) {
    if (line[cursor] !== '`') {
      output += line[cursor];
      cursor += 1;
      continue;
    }

    let delimiterLength = 1;
    while (line[cursor + delimiterLength] === '`') delimiterLength += 1;
    const delimiter = '`'.repeat(delimiterLength);
    const closingIndex = line.indexOf(delimiter, cursor + delimiterLength);
    if (closingIndex === -1) {
      output += ' '.repeat(line.length - cursor);
      break;
    }
    const maskedLength = closingIndex + delimiterLength - cursor;
    output += ' '.repeat(maskedLength);
    cursor += maskedLength;
  }
  return output;
}

function isExternalOrLocalAnchor(target) {
  return (
    target.startsWith('#') ||
    target.startsWith('//') ||
    /^[a-z][a-z\d+.-]*:/iu.test(target)
  );
}

function resolveLinkTarget(sourcePath, rawTarget, root) {
  if (isExternalOrLocalAnchor(rawTarget)) return undefined;
  const withoutFragment = rawTarget.split('#', 1)[0].split('?', 1)[0];
  if (withoutFragment === '') return undefined;

  let decodedTarget;
  try {
    decodedTarget = decodeURIComponent(withoutFragment);
  } catch {
    return null;
  }

  const targetPath = decodedTarget.startsWith('/')
    ? resolve(root, `.${decodedTarget}`)
    : resolve(dirname(sourcePath), decodedTarget);
  const targetRelativePath = relative(root, targetPath);
  if (
    targetRelativePath === '..' ||
    targetRelativePath.startsWith(`..${sep}`) ||
    isAbsolute(targetRelativePath)
  ) {
    return null;
  }
  return targetPath;
}

async function linkExists(sourcePath, target, root) {
  const targetPath = resolveLinkTarget(sourcePath, target, root);
  if (targetPath === undefined) return true;
  if (targetPath === null) return false;
  return (await pathKind(targetPath)) !== 'missing';
}

async function verifyMarkdownFile(path, root) {
  const issues = [];
  const contents = await readFile(path, 'utf8');
  const pathLabel = displayPath(root, path);
  if (contents.includes('\uFFFD')) {
    issues.push(`${pathLabel}: 包含无效 UTF-8 字符`);
  }
  if (contents !== '' && !contents.endsWith('\n')) {
    issues.push(`${pathLabel}: 缺少末尾换行`);
  }

  const lines = contents.split(/\r?\n/u);
  let fence;
  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;
    if (/[\t ]+$/u.test(line)) {
      issues.push(`${pathLabel}:${lineNumber}: 行尾存在空白`);
    }

    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/u);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fence === undefined) {
        fence = { character: marker[0], length: marker.length };
      } else if (
        marker[0] === fence.character &&
        marker.length >= fence.length
      ) {
        fence = undefined;
      }
      continue;
    }
    if (fence !== undefined) continue;

    const visibleLine = maskInlineCode(line);
    const targets = [];
    for (const match of visibleLine.matchAll(inlineLinkPattern)) {
      targets.push(match[1] ?? match[2]);
    }
    const referenceMatch = visibleLine.match(referenceLinkPattern);
    if (referenceMatch) targets.push(referenceMatch[1] ?? referenceMatch[2]);

    for (const target of targets) {
      if (!(await linkExists(path, target, root))) {
        issues.push(`${pathLabel}:${lineNumber}: 断裂的相对链接 ${target}`);
      }
    }
  }

  if (fence !== undefined) {
    issues.push(`${pathLabel}: 存在未闭合代码围栏`);
  }
  return issues;
}

export async function verifyMarkdown(inputs, root = process.cwd()) {
  const absoluteRoot = resolve(root);
  const files = new Set();
  const issues = [];

  for (const input of inputs) {
    const inputPath = resolve(absoluteRoot, input);
    const kind = await collectMarkdownFiles(inputPath, absoluteRoot, files);
    if (kind === 'missing') issues.push(`${input}: 输入不存在`);
  }

  const fileIssues = await Promise.all(
    [...files]
      .sort((left, right) => left.localeCompare(right))
      .map((path) => verifyMarkdownFile(path, absoluteRoot)),
  );
  return [...issues, ...fileIssues.flat()];
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const inputs = process.argv.slice(2);
  const issues = await verifyMarkdown(
    inputs.length > 0
      ? inputs
      : ['README.md', 'AGENTS.md', 'CLAUDE.md', 'docs'],
  );
  if (issues.length === 0) {
    console.log('Markdown 验证通过');
  } else {
    for (const issue of issues) console.error(issue);
    process.exitCode = 1;
  }
}
