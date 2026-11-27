const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const webDir = path.join(repoRoot, 'apps', 'web');
const prismaBin = path.join(webDir, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');
const fallbackBin = path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');
const cli = fs.existsSync(prismaBin) ? prismaBin : fallbackBin;

execSync(`"${cli}" generate --schema="${path.join(repoRoot, 'prisma', 'schema.prisma')}"`, {
  cwd: repoRoot,
  stdio: 'inherit',
});

const rootGenerated = path.join(repoRoot, 'node_modules', '.prisma');
const webPrismaDir = path.join(webDir, 'node_modules', '.prisma');

if (fs.existsSync(rootGenerated) && fs.existsSync(path.join(webDir, 'node_modules'))) {
  fs.mkdirSync(webPrismaDir, { recursive: true });
  fs.cpSync(rootGenerated, webPrismaDir, { recursive: true, force: true });
  console.log('[generate-prisma] Synchronized generated Prisma Client into apps/web/node_modules/.prisma');
}
