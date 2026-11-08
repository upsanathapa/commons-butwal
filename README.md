# Commons Butwal

A neighbourhood issue map. Neighbours report local problems, confirm each other's
reports, and follow each issue until it is fixed.

**Live demo:** https://commons-butwal.vercel.app

## The problem

Problems like broken streetlights stay unfixed because everyone assumes someone else
has already reported them.

## What it does

- Report a problem by clicking the map
- Neighbours confirm instead of filing duplicates
- Every issue shows how many days it has been open and where it is in the process
- A priority ranking shows which issues need attention first
- A neighbourhood report card shows what percentage has actually been fixed
- Copy a ready-made complaint text to send through Hello Sarkar (1111) or the ward office

## Built with

React, Vite, Leaflet, OpenStreetMap, Supabase, Vercel

## Run it locally

1. `npm install`
2. Copy `.env.example` to `.env` and add your Supabase URL and publishable key
3. `npm run dev`

## Team

Upsana Thapa and Aristal Regmi
