# API Gateway Benchmarks (.NET 9): YARP vs Ocelot vs Node (Fastify)

This repository runs a simple Backend API behind three gateways (YARP, Ocelot, and a Node.js Fastify proxy) and provides a k6 load test to benchmark them sequentially under the same load.

- Runtime: .NET 9
- Gateways: YARP Reverse Proxy, Ocelot, Node.js (Fastify + @fastify/http-proxy)
- Orchestration: Docker Compose
- Load testing: k6 (Grafana)

## Architecture

- Backend.Api
  - Minimal API with /api/test and Swagger UI.
- YarpGateway
  - YARP configured to forward /api/* to Backend.
- OcelotGateway
  - Ocelot configured to forward /api/* to Backend.
- NodeGateway
  - Fastify reverse proxy forwarding /api/* to Backend.
- k6
  - Benchmark script driving sequential runs: YARP ➜ Ocelot ➜ Node.

All containers run HTTP (no TLS) and expose Swagger at /swagger (gateways only for .NET projects).

## Prerequisites

- Docker Desktop 4.x+
- PowerShell or bash
- Optional: Visual Studio 2022 for local debugging

## Quick Start

1) Build and start services
- docker compose up --build -d

2) Verify endpoints
- Backend: http://localhost:8080/api/test
- YARP:    http://localhost:8001/api/test
- Ocelot:  http://localhost:8000/api/test
- Node:    http://localhost:8002/api/test

3) Open Swagger (YARP/Ocelot)
- YARP:   http://localhost:8001/swagger
- Ocelot: http://localhost:8000/swagger

## Run the k6 Benchmark (Sequential)

The script runs YARP ➜ Ocelot ➜ Node, with tunable RPS and VU pool.

Run inside compose (recommended):
- docker compose --profile bench run --rm \
  -e MAX_RPS=2000 -e PRE_VUS=300 -e MAX_VUS=4000 k6

Defaults (override via env):
- MAX_RPS: peak target RPS (default 2000)
- WARMUP_RPS: warmup target (default max(50, 10% of MAX_RPS))
- PRE_VUS: pre-allocated VUs (default 200)
- MAX_VUS: max VUs (default max(1000, MAX_RPS*2))
- GAP_SEC: pause between phases (default 5s)

URLs when running k6:
- In compose (auto): OCELOT_URL=http://ocelot-gateway:8000/api/test, YARP_URL=http://yarp-gateway:8001/api/test
- Outside compose: use host.docker.internal, e.g.:
  - docker run --rm -v "%cd%/k6:/scripts" \
    -e OCELOT_URL=http://host.docker.internal:8000/api/test \
    -e YARP_URL=http://host.docker.internal:8001/api/test \
    -e MAX_RPS=2000 -e PRE_VUS=300 -e MAX_VUS=4000 \
    grafana/k6:0.52.0 run /scripts/benchmark.js

Outputs:
- Console summary
- JSON summary exported to k6/summary.json (via K6_SUMMARY_EXPORT)

## Running k6 Outside Compose

Use host URLs and pass environment variables:

## Fair Comparison

- All services use equalized container resources (cpus: "1.0", mem_limit: 512m in docker-compose.yml).
- Scenarios are strictly sequential to avoid cross-interference.
- Backend returns a tiny JSON payload to minimize downstream variability.

## Troubleshooting

- Desired rate not reached / dropped iterations:
  - Increase MAX_VUS (and possibly PRE_VUS) until k6 sustains the target RPS.
- Running k6 locally against containers:
  - Use host.docker.internal instead of localhost for gateway URLs.
- Ocelot routing not hit:
  - Ensure ocelot.json is included in publish output; in this repo it is copied by default.
- NodeGateway image fails on npm ci (missing lockfile):
  - Generate lockfile once in NodeGateway folder:
    - PowerShell (temporary): 
      - Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
      - npm install
    - Or without changing policy:
      - cmd /c "npm install"
      - or "C:\Program Files\nodejs\npm.cmd" install
    - Commit NodeGateway/package-lock.json, then rebuild:
      - docker compose build node-gateway --no-cache
  - Alternatively, switch the Dockerfile install step to npm install (non-deterministic) if a lockfile is not desired.

## Useful Commands

- Build and run all:

# Build everything
docker compose build --parallel

# Start APIs
docker compose up -d backend-api ocelot-gateway yarp-gateway node-gateway

# Start k6 as part of the compose stack (not a one-off)
docker compose --profile bench up --abort-on-container-exit k6
# Ctrl+C to stop logs; k6 will exit when the run finishes



docker compose --profile bench run --rm \
  -e MAX_RPS=2000 -e PRE_VUS=300 -e MAX_VUS=4000 k6