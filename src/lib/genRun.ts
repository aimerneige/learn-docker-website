import type { Messages } from '../i18n/locales/en';
import { Out, type Line } from './out';

export type RunImage = 'nginx' | 'postgres' | 'redis' | 'mongo';
export type Restart = 'no' | 'always' | 'unless-stopped' | 'on-failure';

export interface RunState {
  image: RunImage;
  detach: boolean;
  rm: boolean;
  name: boolean;
  publish: boolean;
  hostPort: number;
  volume: boolean;
  env: boolean;
  network: boolean;
  restart: Restart;
  memory: boolean;
  memoryMb: number;
  readOnly: boolean;
}

export const RUN_DEFAULTS: RunState = {
  image: 'nginx',
  detach: true,
  rm: false,
  name: true,
  publish: true,
  hostPort: 8080,
  volume: false,
  env: false,
  network: false,
  restart: 'no',
  memory: false,
  memoryMb: 512,
  readOnly: false,
};

export const RUN_IMAGES: Record<RunImage, { ref: string; name: string; port: number; vol: string; mount: string; env: [string, string][] }> = {
  nginx: { ref: 'nginx:1.27-alpine', name: 'web', port: 80, vol: 'site-data', mount: '/usr/share/nginx/html', env: [['NGINX_ENTRYPOINT_QUIET_LOGS', '1']] },
  postgres: {
    ref: 'postgres:17-alpine',
    name: 'db',
    port: 5432,
    vol: 'pg-data',
    mount: '/var/lib/postgresql/data',
    env: [
      ['POSTGRES_PASSWORD', 'example'],
      ['POSTGRES_DB', 'app'],
    ],
  },
  redis: { ref: 'redis:7-alpine', name: 'cache', port: 6379, vol: 'redis-data', mount: '/data', env: [['TZ', 'UTC']] },
  mongo: {
    ref: 'mongo:8',
    name: 'mongo',
    port: 27017,
    vol: 'mongo-data',
    mount: '/data/db',
    env: [
      ['MONGO_INITDB_ROOT_USERNAME', 'root'],
      ['MONGO_INITDB_ROOT_PASSWORD', 'example'],
    ],
  },
};

export function genRun(s: RunState, m: Messages, comments: boolean): { cmd: Line[]; yaml: Line[]; conflict: boolean } {
  const img = RUN_IMAGES[s.image];
  const c = m.gen.run;
  const conflict = s.rm && s.restart !== 'no';
  const restart = conflict ? 'no' : s.restart;

  // --- command ---
  const parts: { flag: string; tag: string; note: string }[] = [];
  if (s.detach) parts.push({ flag: '-d', tag: 'detach', note: c.detach });
  if (s.rm) parts.push({ flag: '--rm', tag: 'rm', note: c.rm });
  if (s.name) parts.push({ flag: `--name ${img.name}`, tag: 'name', note: c.name });
  if (s.publish) parts.push({ flag: `-p ${s.hostPort}:${img.port}`, tag: 'publish', note: c.publish });
  if (s.volume) parts.push({ flag: `-v ${img.vol}:${img.mount}`, tag: 'volume', note: c.volume });
  if (s.env) img.env.forEach(([k, v]) => parts.push({ flag: `-e ${k}=${v}`, tag: 'env', note: c.env }));
  if (s.network) parts.push({ flag: '--network app-net', tag: 'network', note: c.network });
  if (restart !== 'no') parts.push({ flag: `--restart ${restart}`, tag: 'restart', note: c.restart });
  if (s.memory) parts.push({ flag: `-m ${s.memoryMb}m`, tag: 'memory', note: c.memory });
  if (s.readOnly) parts.push({ flag: '--read-only', tag: 'readOnly', note: c.readOnly });

  const cmd = new Out(comments);
  if (s.network) {
    cmd.comment(c.network, 0, 'network');
    cmd.line('docker network create app-net', 'network').line('', 'network');
  }
  if (s.volume) {
    cmd.comment(c.volume, 0, 'volume');
    cmd.line(`docker volume create ${img.vol}`, 'volume').line('', 'volume');
  }
  if (comments && parts.length) {
    const seen = new Set<string>();
    const width = Math.max(...parts.map((p) => p.flag.length));
    for (const p of parts) {
      const key = p.tag === 'env' ? 'env' : p.flag;
      if (seen.has(key)) continue;
      seen.add(key);
      const flag = p.tag === 'env' ? '-e …' : p.flag;
      cmd.line(`# ${flag.padEnd(width)}  ${p.note}`, p.tag);
    }
  }
  if (!parts.length) cmd.line(`docker run ${img.ref}`, 'image');
  else {
    cmd.line('docker run \\', 'image');
    parts.forEach((p) => cmd.line(`  ${p.flag} \\`, p.tag));
    cmd.line(`  ${img.ref}`, 'image');
  }

  // --- compose equivalent ---
  const y = new Out(comments);
  if (s.detach) y.comment('docker compose up -d', 0, 'detach');
  if (s.rm) y.comment(`--rm → docker compose run --rm ${img.name}`, 0, 'rm');
  y.line('services:', 'image');
  y.line(`  ${img.name}:`, 'image');
  y.line(`    image: ${img.ref}`, 'image');
  if (s.name) y.line(`    container_name: ${img.name}`, 'name');
  if (s.publish) {
    y.line('    ports:', 'publish');
    y.line(`      - "${s.hostPort}:${img.port}"${y.ic(c.publish)}`, 'publish');
  }
  if (s.volume) {
    y.line('    volumes:', 'volume');
    y.line(`      - ${img.vol}:${img.mount}`, 'volume');
  }
  if (s.env) {
    y.line('    environment:', 'env');
    img.env.forEach(([k, v]) => y.line(`      ${k}: "${v}"`, 'env'));
  }
  if (s.network) {
    y.line('    networks:', 'network');
    y.line('      - app-net', 'network');
  }
  if (restart !== 'no') y.line(`    restart: ${restart}`, 'restart');
  if (s.memory) y.line(`    mem_limit: ${s.memoryMb}m`, 'memory');
  if (s.readOnly) y.line('    read_only: true', 'readOnly');
  if (s.volume) {
    y.blank();
    y.line('volumes:', 'volume').line(`  ${img.vol}:`, 'volume');
  }
  if (s.network) {
    y.blank();
    y.line('networks:', 'network').line('  app-net:', 'network');
  }
  return { cmd: cmd.done(), yaml: y.done(), conflict };
}
