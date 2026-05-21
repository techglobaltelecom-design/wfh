# Work From Home Employee Management System

Monorepo containing:
- `apps/web`: Next.js web app (Employee + Admin + API routes)
- `apps/desktop-agent`: desktop tracker for idle/activity/screenshot telemetry
- `packages/shared`: shared payload and type contracts

## Features Implemented
- Employee side: login/logout, attendance in/out, start/end work, break timer, task updates, leave requests, screenshot upload, work status updates.
- First-time onboarding: employee activation using employee ID + one-time activation code + password setup.
- Admin side: dashboard, attendance records, pending leave approval, employee reports, performance API, payroll console.
- Advanced tracking: desktop agent sends activity heartbeats, idle-aware status, and periodic screenshots every 5 minutes by default.
- Smart payroll: periodic or manual payroll generation with total hours, overtime, deductions, and salary estimation.

## Quick Start
1. Install dependencies:
   - `npm install`
2. Configure env:
   - Copy `apps/web/.env.example` to `apps/web/.env`
   - Set `JWT_SECRET`, `SCREENSHOT_SIGNING_SECRET`, and optional `AGENT_INGEST_TOKEN`
3. Setup DB:
   - `npm run prisma:generate -w apps/web`
   - `npm run prisma:migrate -w apps/web -- --name init`
   - `npm run prisma:seed -w apps/web`
4. Start services:
   - Web: `npm run dev:web`
   - Desktop agent: `npm run dev:agent`

## First-Time Employee Sign-In
- Admin seeds/invites employees with unique `employeeId`.
- Employee opens `/activate`, enters `employeeId` + activation code, and sets a password.
- After activation, normal login uses `employeeId` or email with password at `/login`.
- Demo seeded activation: employee ID `EMP001`, activation code `WELCOME123`.

## Desktop Agent Env
Set these for `apps/desktop-agent`:
- `AGENT_API_BASE_URL` (default `http://localhost:3000`)
- `AGENT_INGEST_TOKEN` (must match web if configured)
- `AGENT_EMPLOYEE_ID` (employee user id in DB)
- `AGENT_SCREENSHOT_INTERVAL_MINUTES` (default `30`)
- `AGENT_HEARTBEAT_SECONDS` (default `60`)
- `AGENT_IDLE_THRESHOLD_SECONDS` (default `300`)

## Windows EXE Build (Desktop Agent)
- Build command:
  - `npm run build:exe:win -w apps/desktop-agent`
- Output binary:
  - `apps/desktop-agent/dist/wfh-desktop-agent.exe`
- Runtime config:
  - Copy `apps/desktop-agent/.env.example` to `apps/desktop-agent/.env`
  - Set employee-specific values (`AGENT_EMPLOYEE_ID`, `AGENT_API_BASE_URL`, optional `AGENT_INGEST_TOKEN`)

## Employee Install (Windows)
- IT/Admin shares:
  - `wfh-desktop-agent.exe`
  - `.env` file for that employee/machine
- Employee setup:
  - Place both files in the same folder (for example `C:\WFH-Agent`)
  - Double-click `wfh-desktop-agent.exe` or run it from PowerShell
- Recommended:
  - Add app to Windows Startup so tracking starts after login

## Security and Ops Notes
- Screenshot records are served via signed URLs and access is audit-logged.
- Admin can review a full-day screenshot timeline with capture timestamps.
- Admin actions (leave decisions, payroll recalculation) are written to audit logs.
- Job scheduler scaffold exists in `apps/web/src/server/jobs/scheduler.ts` for daily/weekly workloads.
