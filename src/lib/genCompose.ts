import type { Messages } from '../i18n/locales/en';
import { Out, type Line } from './out';
import type { Restart } from './genRun';
import { DEFAULT_PORTS, type Runtime } from './genDockerfile';

export type Engine = 'postgres' | 'mysql' | 'mongo';

export interface ComposeState {
  web: { on: boolean; server: 'nginx' | 'caddy'; port: number; https: boolean };
  app: { on: boolean; runtime: Runtime; source: 'build' | 'image'; devMount: boolean; replicas: number };
  db: { on: boolean; engine: Engine; persist: boolean; expose: boolean; health: boolean; secrets: boolean };
  cache: { on: boolean; aof: boolean };
  global: { restart: Restart; networks: boolean; limits: boolean; cpus: number; memory: number; logging: boolean };
}

export const COMPOSE_DEFAULTS: ComposeState = {
  web: { on: true, server: 'nginx', port: 8080, https: false },
  app: { on: true, runtime: 'node', source: 'build', devMount: false, replicas: 1 },
  db: { on: true, engine: 'postgres', persist: true, expose: false, health: true, secrets: false },
  cache: { on: false, aof: false },
  global: { restart: 'unless-stopped', networks: false, limits: false, cpus: 0.5, memory: 512, logging: false },
};

const ENGINES: Record<
  Engine,
  { image: string; port: number; data: string; env: (secret: boolean) => [string, string][]; health: string; url: string; volume: string }
> = {
  postgres: {
    image: 'postgres:17-alpine',
    port: 5432,
    data: '/var/lib/postgresql/data',
    volume: 'db-data',
    env: (sec) => [
      ['POSTGRES_USER', 'app'],
      sec ? ['POSTGRES_PASSWORD_FILE', '/run/secrets/db_password'] : ['POSTGRES_PASSWORD', 'example'],
      ['POSTGRES_DB', 'app'],
    ],
    health: '["CMD-SHELL", "pg_isready -U app -d app"]',
    url: 'postgres://app:example@db:5432/app',
  },
  mysql: {
    image: 'mysql:8.4',
    port: 3306,
    data: '/var/lib/mysql',
    volume: 'db-data',
    env: (sec) => [
      sec ? ['MYSQL_ROOT_PASSWORD_FILE', '/run/secrets/db_password'] : ['MYSQL_ROOT_PASSWORD', 'example'],
      ['MYSQL_DATABASE', 'app'],
    ],
    health: '["CMD", "mysqladmin", "ping", "-h", "localhost"]',
    url: 'mysql://root:example@db:3306/app',
  },
  mongo: {
    image: 'mongo:8',
    port: 27017,
    data: '/data/db',
    volume: 'db-data',
    env: (sec) => [
      ['MONGO_INITDB_ROOT_USERNAME', 'root'],
      sec ? ['MONGO_INITDB_ROOT_PASSWORD_FILE', '/run/secrets/db_password'] : ['MONGO_INITDB_ROOT_PASSWORD', 'example'],
    ],
    health: '["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand(\'ping\')"]',
    url: 'mongodb://root:example@db:27017',
  },
};

const fmtMem = (mb: number) => (mb >= 1024 ? `${mb / 1024}G` : `${mb}M`);

export function genCompose(s: ComposeState, m: Messages, comments: boolean): Line[] {
  const c = m.gen.compose;
  const o = new Out(comments);
  const { web, app, db, cache, global: g } = s;
  if (!web.on && !app.on && !db.on && !cache.on) return [];

  const useDefaults = g.restart !== 'no' || g.logging || g.limits;
  const split = g.networks;
  const appPort = DEFAULT_PORTS[app.runtime];

  o.comment(c.header, 0, 'header');
  o.line('name: myapp', 'header');
  o.blank();

  if (useDefaults) {
    o.line('x-defaults: &defaults', 'global');
    if (g.restart !== 'no') {
      o.comment(c.restart, 2, 'global.restart');
      o.line(`  restart: ${g.restart}`, 'global.restart');
    }
    if (g.logging) {
      o.comment(c.logging, 2, 'global.logging');
      o.line('  logging:', 'global.logging');
      o.line('    driver: json-file', 'global.logging');
      o.line('    options:', 'global.logging');
      o.line('      max-size: "10m"', 'global.logging');
      o.line('      max-file: "3"', 'global.logging');
    }
    if (g.limits) {
      o.comment(c.limits, 2, 'global.limits');
      resources(o, 2, g);
    }
    o.blank();
  }

  o.comment(c.services, 0, 'header');
  o.line('services:', 'header');
  const inherit = () => useDefaults && o.line('    <<: *defaults', 'global');
  const nets = (list: string[], tag: string) => {
    if (!split) return;
    o.line('    networks:', tag);
    list.forEach((n) => o.line(`      - ${n}`, tag));
  };

  // --- web ---
  if (web.on) {
    o.comment(c.web, 2, 'web');
    o.line('  web:', 'web');
    inherit();
    if (web.server === 'nginx') o.line('    image: nginx:1.27-alpine', 'web.server');
    else o.line('    image: caddy:2-alpine', 'web.server');
    o.line('    ports:', 'web.port');
    o.line(`      - "${web.port}:80"${o.ic(c.ports)}`, 'web.port');
    if (web.https) o.line('      - "443:443"', 'web.https');
    o.comment(c.webConf, 4, 'web.server');
    o.line('    volumes:', 'web.server');
    if (web.server === 'nginx') o.line('      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro', 'web.server');
    else {
      o.line('      - ./Caddyfile:/etc/caddy/Caddyfile:ro', 'web.server');
      o.line('      - caddy-data:/data', 'web.server');
    }
    if (app.on) {
      o.comment(c.dependsOn, 4, 'web');
      o.line('    depends_on:', 'web');
      o.line('      - app', 'web');
    }
    nets(['frontend'], 'global.networks');
    o.blank();
  }

  // --- app ---
  if (app.on) {
    o.comment(c.app, 2, 'app');
    o.line('  app:', 'app');
    inherit();
    if (app.source === 'build') {
      o.comment(c.build, 4, 'app.source');
      o.line('    build: ./app', 'app.source');
    } else o.line(`    image: ghcr.io/example/app-${app.runtime}:1.0`, 'app.source');
    o.comment(c.env, 4, 'app');
    o.line('    environment:', 'app');
    o.line(`      PORT: "${appPort}"`, 'app.runtime');
    if (db.on) {
      if (db.secrets) o.line('      DB_PASSWORD_FILE: /run/secrets/db_password', 'db.secrets');
      o.line(`      DATABASE_URL: ${db.secrets ? ENGINES[db.engine].url.replace(':example@', '@') : ENGINES[db.engine].url}`, 'db.engine');
    }
    if (cache.on) o.line('      REDIS_URL: redis://cache:6379', 'cache');
    if (!web.on) {
      o.line('    ports:', 'app');
      const hostPorts = app.replicas > 1 ? `${appPort}-${appPort + app.replicas - 1}` : `${appPort}`;
      o.line(`      - "${hostPorts}:${appPort}"${o.ic(c.ports)}`, 'app.runtime');
    }
    if (app.devMount) {
      o.comment(c.devMount, 4, 'app.devMount');
      o.line('    volumes:', 'app.devMount');
      o.line('      - ./app/src:/app/src', 'app.devMount');
    }
    if (app.replicas > 1) {
      o.comment(c.replicas, 4, 'app.replicas');
      o.line('    deploy:', 'app.replicas');
      o.line(`      replicas: ${app.replicas}`, 'app.replicas');
      if (g.limits) resources(o, 6, g, true);
    }
    if (db.on && db.secrets) {
      o.line('    secrets:', 'db.secrets');
      o.line('      - db_password', 'db.secrets');
    }
    if (db.on || cache.on) {
      o.comment(c.dependsOn, 4, 'app');
      o.line('    depends_on:', 'app');
      if (db.on) {
        o.line('      db:', 'db');
        o.line(`        condition: ${db.health ? 'service_healthy' : 'service_started'}`, 'db.health');
      }
      if (cache.on) {
        o.line('      cache:', 'cache');
        o.line('        condition: service_started', 'cache');
      }
    }
    nets(web.on ? ['frontend', 'backend'] : ['backend'], 'global.networks');
    o.blank();
  }

  // --- db ---
  if (db.on) {
    const e = ENGINES[db.engine];
    o.comment(c.db, 2, 'db');
    o.line('  db:', 'db');
    inherit();
    o.line(`    image: ${e.image}`, 'db.engine');
    o.line('    environment:', 'db.engine');
    e.env(db.secrets).forEach(([k, v]) => o.line(`      ${k}: ${v}`, k.endsWith('_FILE') ? 'db.secrets' : 'db.engine'));
    if (db.secrets) {
      o.comment(c.secrets, 4, 'db.secrets');
      o.line('    secrets:', 'db.secrets');
      o.line('      - db_password', 'db.secrets');
    }
    if (db.persist) {
      o.line('    volumes:', 'db.persist');
      o.line(`      - ${e.volume}:${e.data}${o.ic(c.dbVolume)}`, 'db.persist');
    }
    if (db.expose) {
      o.comment(c.dbPort, 4, 'db.expose');
      o.line('    ports:', 'db.expose');
      o.line(`      - "127.0.0.1:${e.port}:${e.port}"`, 'db.expose');
    }
    if (db.health) {
      o.comment(c.health, 4, 'db.health');
      o.line('    healthcheck:', 'db.health');
      o.line(`      test: ${e.health}`, 'db.health');
      o.line('      interval: 5s', 'db.health');
      o.line('      timeout: 3s', 'db.health');
      o.line('      retries: 5', 'db.health');
    }
    nets(['backend'], 'global.networks');
    o.blank();
  }

  // --- cache ---
  if (cache.on) {
    o.comment(c.cache, 2, 'cache');
    o.line('  cache:', 'cache');
    inherit();
    o.line('    image: redis:7-alpine', 'cache');
    if (cache.aof) {
      o.comment(c.aof, 4, 'cache.aof');
      o.line('    command: ["redis-server", "--appendonly", "yes"]', 'cache.aof');
      o.line('    volumes:', 'cache.aof');
      o.line('      - cache-data:/data', 'cache.aof');
    }
    nets(['backend'], 'global.networks');
    o.blank();
  }

  // --- top level ---
  if (split) {
    o.blank();
    o.comment(c.networks, 0, 'global.networks');
    o.line('networks:', 'global.networks');
    if (web.on) o.line('  frontend:', 'global.networks');
    o.line(`  backend:`, 'global.networks');
    if (web.on) o.line(`    internal: true${o.ic(c.internal)}`, 'global.networks');
  }

  const vols: [string, string][] = [];
  if (web.on && web.server === 'caddy') vols.push(['caddy-data', 'web.server']);
  if (db.on && db.persist) vols.push([ENGINES[db.engine].volume, 'db.persist']);
  if (cache.on && cache.aof) vols.push(['cache-data', 'cache.aof']);
  if (vols.length) {
    o.blank();
    o.comment(c.volumes, 0, vols[0][1]);
    o.line('volumes:', vols.length === 1 ? vols[0][1] : 'volumes');
    vols.forEach(([v, tag]) => o.line(`  ${v}:`, tag));
  }

  if (db.on && db.secrets) {
    o.blank();
    o.comment(c.secretsTop, 0, 'db.secrets');
    o.line('secrets:', 'db.secrets');
    o.line('  db_password:', 'db.secrets');
    o.line('    file: ./secrets/db_password.txt', 'db.secrets');
  }

  return o.done();
}

function resources(o: Out, indent: number, g: ComposeState['global'], nested = false) {
  const p = ' '.repeat(indent);
  if (!nested) o.line(`${p}deploy:`, 'global.limits');
  const q = nested ? p : `${p}  `;
  o.line(`${q}resources:`, 'global.limits');
  o.line(`${q}  limits:`, 'global.limits');
  o.line(`${q}    cpus: "${g.cpus}"`, 'global.limits');
  o.line(`${q}    memory: ${fmtMem(g.memory)}`, 'global.limits');
}
