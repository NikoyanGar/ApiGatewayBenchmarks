import http from 'k6/http';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

// Endpoints (override when running outside docker compose)
const OCELOT_URL = __ENV.OCELOT_URL || 'http://localhost:8000/api/test';
const YARP_URL   = __ENV.YARP_URL   || 'http://localhost:8001/api/test';
const FAST_URL   = __ENV.FAST_URL   || 'http://localhost:8002/api/test';

// Load settings (tunable via env)
const MAX_RPS     = Number(__ENV.MAX_RPS     || 2000);
const WARMUP_RPS  = Number(__ENV.WARMUP_RPS  || Math.max(50, Math.round(MAX_RPS * 0.1)));
const PRE_VUS     = Number(__ENV.PRE_VUS     || 200);
const MAX_VUS     = Number(__ENV.MAX_VUS     || Math.max(1000, MAX_RPS * 2));
const GAP_SEC     = Number(__ENV.GAP_SEC     || 5);

// Define same plan (in seconds)
const yarpStagesSec = [
  { duration: 15, target: WARMUP_RPS },
  { duration: 30, target: Math.round(MAX_RPS / 2) },
  { duration: 60, target: MAX_RPS },
  { duration: 30, target: Math.round(MAX_RPS * 1.5) },
  { duration: 15, target: 0 },
];

const ocelotStagesSec = [
  { duration: 15, target: WARMUP_RPS },
  { duration: 30, target: Math.round(MAX_RPS / 2) },
  { duration: 60, target: MAX_RPS },
  { duration: 30, target: Math.round(MAX_RPS * 1.5) },
  { duration: 15, target: 0 },
];

const fastStagesSec = [
  { duration: 15, target: WARMUP_RPS },
  { duration: 30, target: Math.round(MAX_RPS / 2) },
  { duration: 60, target: MAX_RPS },
  { duration: 30, target: Math.round(MAX_RPS * 1.5) },
  { duration: 15, target: 0 },
];

// Helpers
const toK6Stages = (stagesSec) => stagesSec.map(s => ({ duration: `${s.duration}s`, target: s.target }));
const totalSec = (stagesSec) => stagesSec.reduce((a, s) => a + s.duration, 0);

// Metrics
const tYarp = new Trend('yarp_latency', true);
const tOcelot = new Trend('ocelot_latency', true);
const tFast = new Trend('fast_latency', true);

// Sequential scenarios: YARP -> Ocelot -> Fastify (Node)
const yarpTotal = totalSec(yarpStagesSec);
const ocelotStart = `${yarpTotal + GAP_SEC}s`;
const ocelotTotal = totalSec(ocelotStagesSec);
const fastStart = `${yarpTotal + GAP_SEC + ocelotTotal + GAP_SEC}s`;

export const options = {
  scenarios: {
    yarp: {
      executor: 'ramping-arrival-rate',
      startTime: '0s',
      preAllocatedVUs: PRE_VUS,
      maxVUs: MAX_VUS,
      timeUnit: '1s',
      stages: toK6Stages(yarpStagesSec),
      exec: 'hitYarp',
      tags: { gateway: 'yarp' },
    },
    ocelot: {
      executor: 'ramping-arrival-rate',
      startTime: ocelotStart,
      preAllocatedVUs: PRE_VUS,
      maxVUs: MAX_VUS,
      timeUnit: '1s',
      stages: toK6Stages(ocelotStagesSec),
      exec: 'hitOcelot',
      tags: { gateway: 'ocelot' },
    },
    fast: {
      executor: 'ramping-arrival-rate',
      startTime: fastStart,
      preAllocatedVUs: PRE_VUS,
      maxVUs: MAX_VUS,
      timeUnit: '1s',
      stages: toK6Stages(fastStagesSec),
      exec: 'hitFast',
      tags: { gateway: 'fast' },
    },
  },
  thresholds: {
    'http_req_failed{gateway:yarp}':   [{ threshold: 'rate<0.01', abortOnFail: false }],
    'http_req_failed{gateway:ocelot}': [{ threshold: 'rate<0.01', abortOnFail: false }],
    'http_req_failed{gateway:fast}':   [{ threshold: 'rate<0.01', abortOnFail: false }],
    'yarp_latency':   [{ threshold: 'p(95)<50', abortOnFail: false }],
    'ocelot_latency': [{ threshold: 'p(95)<50', abortOnFail: false }],
    'fast_latency':   [{ threshold: 'p(95)<50', abortOnFail: false }],
  },
  discardResponseBodies: true,
};

export function hitYarp() {
  const res = http.get(YARP_URL, { tags: { gateway: 'yarp' } });
  tYarp.add(res.timings.duration);
  check(res, { 'status is 200 (yarp)': r => r.status === 200 });
}

export function hitOcelot() {
  const res = http.get(OCELOT_URL, { tags: { gateway: 'ocelot' } });
  tOcelot.add(res.timings.duration);
  check(res, { 'status is 200 (ocelot)': r => r.status === 200 });
}

export function hitFast() {
  const res = http.get(FAST_URL, { tags: { gateway: 'fast' } });
  tFast.add(res.timings.duration);
  check(res, { 'status is 200 (fast)': r => r.status === 200 });
}