---
type: overview
updated: 2026-04-18 16:27
---
# Boomer Counselor - Overview

Multi-tool AI college counselling platform at boomercounselor.com.

## What It Is
A single-domain hub serving a static landing page plus three independent React/Vite tools under path prefixes (/careers/, /profile/, /college-search/). Three more tools are planned (Coming Soon in dropdown).

## Who Uses It
Students exploring college options, guided by counsellors. The hub tracks sign-ins via Google Sheets for funnel analysis.

## Revenue Model
College Search is a paid tool with Razorpay checkout. Other tools are free.

## Key Architecture Decision
Monorepo with dist/ folders committed to git. Netlify serves the root directory and rewrites sub-paths to the appropriate dist/ folder. No build step on Netlify - builds happen locally (or in Claude Code) before push.
