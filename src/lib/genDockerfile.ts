import type { Messages } from '../i18n/locales/en';
import { fmt } from '../i18n';
import { Out, type Line } from './out';

export type Runtime = 'node' | 'python' | 'go';
export type Variant = 'full' | 'slim' | 'alpine';

export interface DfState {
  runtime: Runtime;
  variant: Variant;
  multiStage: boolean;
  cacheDeps: boolean;
  nonRoot: boolean;
  healthcheck: boolean;
  prodEnv: boolean;
  port: number;
}

export const DF_DEFAULTS: DfState = {
  runtime: 'node',
  variant: 'alpine',
  multiStage: false,
  cacheDeps: true,
  nonRoot: false,
  healthcheck: false,
  prodEnv: true,
  port: 3000,
};

export const DEFAULT_PORTS: Record<Runtime, number> = { node: 3000, python: 8000, go: 8080 };
/** golang has no "slim" tag. */
export const VARIANTS: Record<Runtime, Variant[]> = { node: ['full', 'slim', 'alpine'], python: ['full', 'slim', 'alpine'], go: ['full', 'alpine'] };

export interface LayerInfo {
  label: string;
  size: number; // MB
  kind: 'base' | 'deps' | 'src' | 'build' | 'meta';
}

export interface DfResult {
  lines: Line[];
  layers: LayerInfo[];
  /** Layers built in the builder stage and thrown away. */
  discarded: LayerInfo[];
  total: number;
}

const BASE: Record<Runtime, Record<Variant, { ref: string; size: number }>> = {
  node: { full: { ref: 'node:22', size: 1100 }, slim: { ref: 'node:22-slim', size: 240 }, alpine: { ref: 'node:22-alpine', size: 160 } },
  python: { full: { ref: 'python:3.13', size: 1020 }, slim: { ref: 'python:3.13-slim', size: 150 }, alpine: { ref: 'python:3.13-alpine', size: 60 } },
  go: { full: { ref: 'golang:1.23', size: 840 }, slim: { ref: 'golang:1.23', size: 840 }, alpine: { ref: 'golang:1.23-alpine', size: 260 } },
};

export function genDockerfile(s: DfState, m: Messages, comments: boolean): DfResult {
  const c = m.gen.dockerfile;
  const o = new Out(comments);
  const base = BASE[s.runtime][s.variant];
  const variantName = m.playground.dockerfile.variants[s.variant];
  const layers: LayerInfo[] = [];
  const discarded: LayerInfo[] = [];
  let stage: LayerInfo[] = layers;
  const L = (label: string, size: number, kind: LayerInfo['kind']) => stage.push({ label, size, kind });
  const port = s.port;
  const alpine = s.variant === 'alpine';

  o.line('# syntax=docker/dockerfile:1', 'base');
  o.blank();

  const healthLine = (cmd: string) => {
    if (!s.healthcheck) return;
    o.comment(c.health, 0, 'healthcheck');
    o.line(`HEALTHCHECK --interval=30s --timeout=3s --retries=3 \\`, 'healthcheck');
    o.line(`  CMD ${cmd}`, 'healthcheck');
  };
  const expose = () => {
    o.comment(c.expose, 0, 'port');
    o.line(`EXPOSE ${port}`, 'port');
  };

  if (s.runtime === 'node') {
    const manifest = 'COPY package.json package-lock.json ./';
    const install = (prod: boolean) => `RUN npm ci${prod ? ' --omit=dev' : ''}`;
    if (s.multiStage) {
      stage = discarded;
      o.comment(c.builder, 0, 'multiStage');
      o.line(`FROM ${base.ref} AS builder`, 'base');
      L(`FROM ${base.ref}`, base.size, 'base');
      o.line('WORKDIR /app', 'base');
      depsThenSource(o, s, c, manifest, install(false), 180, L);
      o.comment(c.compile, 0, 'multiStage');
      o.line('RUN npm run build', 'multiStage');
      L('RUN npm run build', 4, 'build');
      o.blank();
      stage = layers;
      o.comment(c.runtime, 0, 'multiStage');
      o.line(`FROM ${base.ref}`, 'base');
      L(`FROM ${base.ref}`, base.size, 'base');
      o.line('WORKDIR /app', 'base');
      if (s.prodEnv) {
        o.comment(c.env, 0, 'prodEnv');
        o.line('ENV NODE_ENV=production', 'prodEnv');
      }
      o.line(manifest, 'multiStage');
      L(manifest, 0.1, 'deps');
      o.line(install(true), 'multiStage');
      L(install(true), 60, 'deps');
      o.comment(c.copyArtifact, 0, 'multiStage');
      o.line('COPY --from=builder /app/dist ./dist', 'multiStage');
      L('COPY --from=builder /app/dist', 4, 'build');
    } else {
      o.comment(fmt(c.base, { variant: variantName }), 0, 'base');
      o.line(`FROM ${base.ref}`, 'base');
      L(`FROM ${base.ref}`, base.size, 'base');
      o.comment(c.workdir, 0, 'base');
      o.line('WORKDIR /app', 'base');
      if (s.prodEnv) {
        o.comment(c.env, 0, 'prodEnv');
        o.line('ENV NODE_ENV=production', 'prodEnv');
      }
      depsThenSource(o, s, c, manifest, install(s.prodEnv), s.prodEnv ? 60 : 180, L);
    }
    userBlock(o, s, c, 'node', alpine, L);
    expose();
    healthLine(`node -e "fetch('http://localhost:${port}/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"`);
    o.comment(c.cmd, 0, 'base');
    o.line(`CMD ["node", "${s.multiStage ? 'dist/server.js' : 'server.js'}"]`, 'base');
  }

  if (s.runtime === 'python') {
    const manifest = 'COPY requirements.txt ./';
    const install = 'RUN pip install --no-cache-dir -r requirements.txt';
    const env = () => {
      if (!s.prodEnv) return;
      o.comment(c.env, 0, 'prodEnv');
      o.line('ENV PYTHONDONTWRITEBYTECODE=1 \\', 'prodEnv');
      o.line('    PYTHONUNBUFFERED=1', 'prodEnv');
    };
    if (s.multiStage) {
      stage = discarded;
      o.comment(c.builder, 0, 'multiStage');
      o.line(`FROM ${base.ref} AS builder`, 'base');
      L(`FROM ${base.ref}`, base.size, 'base');
      o.line('WORKDIR /app', 'base');
      o.line('RUN python -m venv /opt/venv', 'multiStage');
      L('RUN python -m venv', 20, 'build');
      o.line('ENV PATH="/opt/venv/bin:$PATH"', 'multiStage');
      if (s.cacheDeps) {
        o.comment(c.manifest, 0, 'cacheDeps');
        o.line(manifest, 'cacheDeps');
        L(manifest, 0.1, 'deps');
      } else {
        o.comment(c.sourceAll, 0, 'cacheDeps');
        o.line('COPY . .', 'cacheDeps');
        L('COPY . .', 3, 'src');
      }
      o.comment(c.install, 0, 'base');
      o.line(install, 'base');
      L(install, 90, 'deps');
      o.blank();
      stage = layers;
      o.comment(c.runtime, 0, 'multiStage');
      o.line(`FROM ${base.ref}`, 'base');
      L(`FROM ${base.ref}`, base.size, 'base');
      env();
      o.line('ENV PATH="/opt/venv/bin:$PATH"', 'multiStage');
      o.line('WORKDIR /app', 'base');
      o.comment(c.copyArtifact, 0, 'multiStage');
      o.line('COPY --from=builder /opt/venv /opt/venv', 'multiStage');
      L('COPY --from=builder /opt/venv', 80, 'deps');
      o.comment(c.source, 0, 'base');
      o.line('COPY . .', 'base');
      L('COPY . .', 3, 'src');
    } else {
      o.comment(fmt(c.base, { variant: variantName }), 0, 'base');
      o.line(`FROM ${base.ref}`, 'base');
      L(`FROM ${base.ref}`, base.size, 'base');
      env();
      o.comment(c.workdir, 0, 'base');
      o.line('WORKDIR /app', 'base');
      depsThenSource(o, s, c, manifest, install, 110, L);
    }
    userBlock(o, s, c, 'python', alpine, L);
    expose();
    healthLine(`python -c "import urllib.request; urllib.request.urlopen('http://localhost:${port}/health')"`);
    o.comment(c.cmd, 0, 'base');
    o.line(`CMD ["gunicorn", "--bind", "0.0.0.0:${port}", "app:app"]`, 'base');
  }

  if (s.runtime === 'go') {
    const manifest = 'COPY go.mod go.sum ./';
    const install = 'RUN go mod download';
    if (s.multiStage) {
      stage = discarded;
      o.comment(c.builder, 0, 'multiStage');
      o.line(`FROM ${base.ref} AS builder`, 'base');
      L(`FROM ${base.ref}`, base.size, 'base');
      o.line('WORKDIR /src', 'base');
      depsThenSource(o, s, c, manifest, install, 120, L);
      o.comment(c.compile, 0, 'multiStage');
      o.line('RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/server .', 'multiStage');
      L('RUN go build', 60, 'build');
      o.blank();
      stage = layers;
      const final = alpine ? 'alpine:3.20' : `gcr.io/distroless/static-debian12${s.nonRoot ? ':nonroot' : ''}`;
      o.comment(c.runtime, 0, 'multiStage');
      o.line(`FROM ${final}`, 'base');
      L(`FROM ${final}`, alpine ? 8 : 2, 'base');
      if (s.prodEnv) {
        o.comment(c.env, 0, 'prodEnv');
        o.line('ENV APP_ENV=production', 'prodEnv');
      }
      o.comment(c.copyArtifact, 0, 'multiStage');
      o.line('COPY --from=builder /out/server /server', 'multiStage');
      L('COPY --from=builder /out/server', 12, 'build');
      if (s.nonRoot) {
        o.comment(c.user, 0, 'nonRoot');
        if (alpine) {
          o.line('RUN adduser -D -u 10001 app', 'nonRoot');
          L('RUN adduser', 0.01, 'meta');
          o.line('USER app', 'nonRoot');
        } else o.line('USER nonroot:nonroot', 'nonRoot');
      }
      expose();
      healthLine('["/server", "-healthcheck"]');
      o.comment(c.cmd, 0, 'base');
      o.line('CMD ["/server"]', 'base');
    } else {
      o.comment(fmt(c.base, { variant: variantName }), 0, 'base');
      o.line(`FROM ${base.ref}`, 'base');
      L(`FROM ${base.ref}`, base.size, 'base');
      if (s.prodEnv) {
        o.comment(c.env, 0, 'prodEnv');
        o.line('ENV APP_ENV=production', 'prodEnv');
      }
      o.comment(c.workdir, 0, 'base');
      o.line('WORKDIR /app', 'base');
      depsThenSource(o, s, c, manifest, install, 120, L);
      o.comment(c.compile, 0, 'base');
      o.line('RUN go build -o /app/server .', 'base');
      L('RUN go build', 60, 'build');
      userBlock(o, s, c, 'go', alpine, L);
      expose();
      healthLine('["/app/server", "-healthcheck"]');
      o.comment(c.cmd, 0, 'base');
      o.line('CMD ["/app/server"]', 'base');
    }
  }

  const total = layers.reduce((a, l) => a + l.size, 0);
  return { lines: o.done(), layers, discarded, total };
}

type C = Messages['gen']['dockerfile'];
type AddLayer = (label: string, size: number, kind: LayerInfo['kind']) => void;

function depsThenSource(o: Out, s: DfState, c: C, manifest: string, install: string, depSize: number, L: AddLayer) {
  if (s.cacheDeps) {
    o.comment(c.manifest, 0, 'cacheDeps');
    o.line(manifest, 'cacheDeps');
    L(manifest, 0.1, 'deps');
    o.comment(c.install, 0, 'base');
    o.line(install, 'base');
    L(install, depSize, 'deps');
    o.comment(c.source, 0, 'base');
    o.line('COPY . .', 'base');
    L('COPY . .', 3, 'src');
  } else {
    o.comment(c.sourceAll, 0, 'cacheDeps');
    o.line('COPY . .', 'cacheDeps');
    L('COPY . .', 3, 'src');
    o.comment(c.install, 0, 'base');
    o.line(install, 'base');
    L(install, depSize, 'deps');
  }
}

function userBlock(o: Out, s: DfState, c: C, rt: Runtime, alpine: boolean, L: AddLayer) {
  if (!s.nonRoot) return;
  o.comment(c.user, 0, 'nonRoot');
  if (rt === 'node') {
    // Official node images already ship a "node" user.
    o.line('USER node', 'nonRoot');
    return;
  }
  o.line(alpine ? 'RUN adduser -D -u 10001 app' : 'RUN useradd --create-home --uid 10001 app', 'nonRoot');
  L(alpine ? 'RUN adduser' : 'RUN useradd', 0.01, 'meta');
  o.line('USER app', 'nonRoot');
}
