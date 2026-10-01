# ADR-0001 · Next.js 16 App Router over Vite

**Status:** accepted · 2026-10-01

## Context

The brief allows Next.js (App Router) or Vite + React Router. The app is mostly client-side because the API uses browser-held bearer tokens. The repo is already scaffolded with Next.js 16.3, React 19, Tailwind v4.

## Decision

Use Next.js 16 App Router.

## Consequences

- File-based layouts (auth vs app shell), `loading` / `error` / `not-found` conventions, `next/font`, metadata, security headers in config, `proxy.ts`, one-click Vercel deploys.
- Most authenticated pages are Client Components (ADR-0002), so some server features go unused. We say so openly instead of forcing Server Components where they don't fit.
- Runner-up: Vite + React Router would be a slightly leaner fit for a pure SPA.
