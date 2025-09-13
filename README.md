# API Gateway Benchmarks (.NET 9): YARP vs Ocelot

This repository runs a simple Backend API behind two gateways (YARP and Ocelot) and provides a k6 load test to benchmark them sequentially under maximum pressure.

- Runtime: .NET 9
- Gateways: YARP Reverse Proxy, Ocelot
- Orchestration: Docker Compose
- Load testing: k6 (Grafana)

## Architecture

- Backend.Api
  - Minimal API with /api/test and Swagger UI.
- YarpGateway
  - YARP configured to forward /api/* to Backend.
- OcelotGateway
  - Ocelot configured to forward /api/* to Backend.
- k6
  - Benchmark script driving sequential runs: first YARP, then Ocelot.

All containers run HTTP (no TLS) and expose Swagger at /swagger.

## Project Structure

## Prerequisites

- Docker Desktop 4.x+
- PowerShell or bash
- Optional: Visual Studio 2022 for local debugging

## Quick Start

1) Build and start services
- docker compose up --build -d

2) Verify endpoints
- Backend: http://localhost:8080/api/test
- YARP via gateway: http://localhost:8001/api/test
- Ocelot via gateway: http://localhost:8000/api/test

3) Open Swagger
- Backend: http://localhost:8080/swagger
- YARP: http://localhost:8001/swagger
- Ocelot: http://localhost:8000/swagger

## k6 Benchmark (Sequential, Max Pressure)

The script runs YARP first, then Ocelot, with tunable peak load and VU pool.

Run inside compose (recommended):
- docker compose --profile bench run --rm \
  -e MAX_RPS=2000 -e PRE_VUS=300 -e MAX_VUS=4000 k6

Defaults (override via env):
- MAX_RPS: peak target RPS (default 2000)
- WARMUP_RPS: warmup target (default 10% of MAX_RPS, min 50)
- PRE_VUS: pre-allocated VUs (default 200)
- MAX_VUS: max VUs (default max(1000, MAX_RPS*2))
- GAP_SEC: pause between YARP and Ocelot phases (default 5)

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
- JSON summary exported to k6/summary.json (compose profile sets K6_SUMMARY_EXPORT)

## Fair Comparison

- All services use equalized container resources (cpus: 1, mem_limit: 512m in docker-compose.yml).
- Scenarios are strictly sequential to avoid cross-interference.
- Backend returns a small JSON payload; keep it stateless and avoid external I/O.

## Troubleshooting

- 308 redirects in containers:
  - HTTPS redirection is disabled when ASPNETCORE_ENVIRONMENT=Docker to avoid TLS issues.
- Gateway routing not hit:
  - Ocelot: UseOcelot is placed after MapSwaggerUI and MapControllers so Swagger works.
  - Verify OcelotGateway/ocelot.json is copied to output (csproj uses <Content Update="ocelot.json" ...>).
- Running k6 locally against containers:
  - Use host.docker.internal instead of localhost for gateway URLs.
- Desired rate not reached:
  - Increase MAX_VUS and possibly PRE_VUS until k6 sustains the target RPS.

## Useful Commands

- Build and run: docker compose up --build -d
- Tail logs: docker compose logs -f
- Re-run k6 only: docker compose --profile bench run --rm k6
- Stop all: docker compose down -v

## Notes

- .NET 9 minimal hosting model is used across projects.
- Swagger UI is enabled in Development and Docker environments for all services.
- YARP route is configured via appsettings.json; Ocelot via ocelot.json
