---
name: "SIAP — Ruang Warga"
description: "A welcoming civic information board for anonymous reporting and follow-up."
colors:
  ink: "#123c32"
  muted: "#53685d"
  brand: "#123c32"
  accent: "#d9f36b"
  bg: "#f3f6ee"
  surface: "#fff"
  line: "#d8e0d2"
  tint: "#e8efdf"
  warn-bg: "#f8f1d5"
  warn-ink: "#64501b"
  err-bg: "#f9e9e4"
  err-ink: "#973d2d"
  control-border: "#aebdad"
  action-hover: "#235646"
  focus: "#ab601a"
  green-rule: "#527267"
  received-bg: "#e7eef9"
  received-ink: "#264f86"
typography:
  display:
    fontFamily: "'Bricolage Grotesque Variable', 'Segoe UI', sans-serif"
    fontSize: "clamp(52px, 6.67vw, 96px)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "'Bricolage Grotesque Variable', 'Segoe UI', sans-serif"
    fontSize: "clamp(34px, 3.8vw, 52px)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  title:
    fontFamily: "'Bricolage Grotesque Variable', 'Segoe UI', sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "'Inter Variable', 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
  lead:
    fontFamily: "'Inter Variable', 'Segoe UI', sans-serif"
    fontSize: "16px"
    lineHeight: 1.7
  label:
    fontFamily: "'Inter Variable', 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 650
  input:
    fontFamily: "'Inter Variable', 'Segoe UI', sans-serif"
    fontSize: "16px"
    lineHeight: 1.5
  metric:
    fontFamily: "'Bricolage Grotesque Variable', 'Segoe UI', sans-serif"
    fontSize: "36px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  mono:
    fontFamily: "ui-monospace, 'Cascadia Code', Consolas, monospace"
    letterSpacing: "0.02em"
rounded:
  action: "6px"
  field: "7px"
  attachment: "8px"
  notice: "10px"
  upload: "12px"
  surface: "14px"
  pill: "999px"
  circle: "50%"
spacing:
  step-4: "4px"
  step-8: "8px"
  step-12: "12px"
  step-16: "16px"
  step-20: "20px"
  step-24: "24px"
  step-28: "28px"
  step-32: "32px"
  step-40: "40px"
  step-48: "48px"
  step-64: "64px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.action}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.action-hover}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.action}"
    padding: "12px 18px"
  queue-action:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.action}"
    padding: "8px 12px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.input}"
    rounded: "{rounded.field}"
    padding: "13px 15px"
  document-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "32px"
  badge-received:
    backgroundColor: "{colors.received-bg}"
    textColor: "{colors.received-ink}"
    rounded: "{rounded.pill}"
    padding: "5px 10px"
  notice-error:
    backgroundColor: "{colors.err-bg}"
    textColor: "{colors.err-ink}"
    rounded: "{rounded.notice}"
    padding: "18px 20px"
---

# Design System: SIAP — Ruang Warga

## Overview

**Creative North Star: "Ruang Warga"**

Ruang Warga is a welcoming civic information board: confident humanist headings, continuous deep green public surfaces, chartreuse actions, and open document sections. It makes reporting and follow-up feel approachable while preserving the visible Indonesian SIAP identity and prototype boundary.

Light surfaces support prolonged reading, forms, and staff work. Fine rules, restrained color changes, and authored geometric SVGs organize information without decorative imagery. The homepage composition is recorded in its surface brief; it is not a template for every route.

**Key Characteristics:**

- Confident Bricolage Grotesque headings with readable Inter text.
- Deep green continuity, chartreuse emphasis, and pale document surfaces.
- Fine rules, modest corners, and geometric line icons.
- Connected progress and explicit loading, empty, error, and validation states.

## Colors

The palette pairs a continuous deep green civic environment with a bright chartreuse action surface and pale green-white reading materials. Frontmatter values are normative and mirror the shipped CSS.

### Primary

- **Deep civic green** (`brand`, also `ink`): header, staff rail, primary actions, headings, chart strokes, and timeline marks.
- **Chartreuse** (`accent`): the public action surface, selected progress, staff selection, and emphasis against green.
- **Action green** (`action-hover`): primary action hover.

### Neutral

- **Pale paper** (`bg`), **White document** (`surface`), and **Soft green** (`tint`): page, document, and inset statistic/loading surfaces.
- **Muted green** (`muted`): supporting text; **Fine line** (`line`), **Control border** (`control-border`), and **Green rule** (`green-rule`): internal divisions and edges on light or green surfaces.

### Semantic states

- **Warm notice** (`warn-bg` / `warn-ink`) and **Clay error** (`err-bg` / `err-ink`): explanatory notices and errors.
- **Received blue** (`received-bg` / `received-ink`): the received status badge. Other status pairs remain defined by the shared status component stylesheet; status names are always visible.
- **Amber focus** (`focus`): keyboard focus on light surfaces. Chartreuse focus is used on green; ink focus is used inside the chartreuse action surface.

**The Public Surface Rule.** Use the green and chartreuse relationship for orientation and action; use light document surfaces when the task requires sustained reading or input.

## Typography

**Display Font:** Bricolage Grotesque Variable, with Segoe UI and sans-serif fallbacks.
**Body Font:** Inter Variable, with Segoe UI and sans-serif fallbacks.
**Label/Mono Font:** Inter for labels; the recorded mono stack for private access codes.

Both primary families are self-hosted through Fontsource imports. Bricolage supplies an open, humanist voice; Inter carries longer instructions and operational detail. Headings use balanced wrapping.

### Hierarchy

- **Display:** the recorded fluid arrival headline; it belongs to the public arrival surface, not routine forms.
- **Headline:** the shared page title. Staff titles use a smaller fluid range (32–44px); at the mobile breakpoint, ordinary public and staff titles become 36px.
- **Title:** document section headings; side-rail headings use a slightly tighter line-height.
- **Body:** base text; document paragraphs usually use 14px and mobile paragraphs 13px. Leads are limited to 74ch; guide body text to 70ch.
- **Label:** sentence-case control labels and action text. Supporting hints use 12px; status badges use 11px.
- **Metric:** prominent tabular numbers; mobile public numbers reduce to 31px.

**The Reading Hierarchy Rule.** Reserve Bricolage Grotesque for headings and prominent numbers; keep instructions, labels, controls, and operational data in Inter.

## Layout

The shared public container is centered at a maximum width of 1312px, with desktop padding of 36px 32px 64px. Working pages pair a flexible document with a 272px side rail and a 40px gap. The staff workspace adds a 230px green rail; staff content has a 1370px maximum and 32px 36px 64px padding. The arrival surface has its own 1440px maximum; its composition remains in `.impeccable/surfaces/web-src-pages-home-tsx.md`.

The recurring rhythm uses the frontmatter spacing steps, with 24–32px document padding and fine internal divisions rather than a separate elevated card for every item. Field spacing is 24px, reducing to 22px on mobile.

- **At 1200px and below:** header and column gaps tighten; the public side rail becomes 240px and the staff rail 200px.
- **At 960px and below:** header navigation wraps into a full-width row; the staff rail becomes horizontal navigation. The queue search spans a row above two filter columns. Public side rails remain alongside documents at 205px.
- **At 700px and below:** public documents and side content stack; page padding becomes 26px 18px 40px and document padding 24px 20px. Guide and transparency columns collapse. Queue filters stack in one column with 16px input text; the queue table becomes a report list with status and action below the title. Its date column is hidden. Public statistics use two columns; staff summary statistics retain three.
- **At 1600px and above:** header horizontal padding follows a centered 1440px alignment.
- **Graphs:** the trend SVG uses a 600 × 180 viewBox and fluid width. Its labels are 14 SVG units on desktop and 24 at the mobile breakpoint; these scale with the SVG, so 24 units are not 24 rendered CSS pixels. The reviewed 390px and 420px layouts retain readable labels. Category bars retain label, track, and value columns.

## Elevation & Depth

Surfaces are flat at rest. Broad tone changes, whitespace, and one-pixel rules establish grouping. The only authored shadow is the brief progress-step arrival animation, fading from a soft green shadow to transparent; it does not create persistent raised cards. Skeleton opacity breathes while content loads. Reduced-motion preferences disable animations and transitions.

**The Quiet Depth Rule.** Separate resting surfaces through tone, spacing, and fine rules; the brief step-arrival shadow signals a state change.

## Shapes

Document surfaces use the shared surface radius; controls have smaller, modest corners. Notices and upload areas sit between these sizes. Pill silhouettes belong to status badges; circles mark steps and timeline events. Dividers are fine rules, and the upload affordance uses a dashed border. Geometric SVG icons use restrained strokes: the shared arrow is 20px with a 1.6-unit stroke, rounded line caps, and rounded joins. No shipping raster was created for this identity.

## Components

### Buttons

Confident, compact actions pair clear labels with optional geometric arrows. The first action in a shared action row is primary; later actions are outlined. Primary and secondary padding and corners are recorded above; action rows wrap with a 12px gap and a 46px minimum control height. Primary hover uses action green; secondary hover uses soft green. The queue action is smaller, with a 40px minimum height and chartreuse hover. Disabled controls use a not-allowed cursor and 0.55 opacity.

### Inputs / Fields

White fields use the control border, recorded input typography, and a 52px minimum height (50px on mobile). Hover strengthens the border. Textareas resize vertically and start at 132px. Invalid fields use clay error borders and a pale error wash; specific text errors appear below the field and are associated with the control. Required staff transition fields remain pristine until a submission attempt. Focus uses a three-pixel outline with a four-pixel offset, with the contextual colors described above.

### Cards / Containers

The shared document surface contains open sections divided by fine rules. General sections use 24px vertical spacing. Shared documents use the surface radius; some transparency chart sections are independent white containers. Empty states use pale paper with a centered heading. Load failures retain explicit error/retry treatment instead of masquerading as empty results.

### Chips / Status

Status badges are compact pills with a small same-color dot and a visible Indonesian status name. Each status has its own legible background/text pair. Attachment chips are wider pale-paper rows with a filename and a remove action; they are not status pills.

### Navigation

The green header uses Inter navigation text and the SIAP wordmark. The current public route has a chartreuse underline; hover turns the link chartreuse. Staff navigation uses a chartreuse selected surface and green text; hover uses a lighter green surface. Semantic current-page markers, breadcrumbs, skip navigation, and visible focus support orientation. Mobile behavior follows Layout.

### Connected progress

Three named reporting steps are connected by fine rules. Completed and current steps differ through text and fill; the current step has an explicit current-step marker and a brief 0.35-second arrival animation. Completed steps include accessible completion text. Timelines reuse circles and connecting rules, with an outlined waiting marker.

### Feedback and data

Warnings and errors use semantic tonal surfaces and readable text. Skeletons represent loading; empty states explain no matching data. The queue announces updates and result counts, preserves distinct loading/error/empty states, and debounces search by 350ms. Charts expose text summaries through accessible labels and use green lines/bars with chartreuse points.

## Do's and Don'ts

### Do:

- Do keep Indonesian labels, the SIAP identity, and the prototype/data-example boundary visible.
- Do preserve visible keyboard focus, associated field errors, meaningful status text, and reduced-motion behavior.
- Do use light document surfaces for forms and staff work, with fine rules inside a shared container.
- Do stack mobile filters and preserve chart labels at the rendered size.

### Don't:

- Don't reuse the homepage action-desk composition as a mandatory layout for every page.
- Don't replace authored SVG icons with text glyphs or emoji.
- Don't present required transition fields as invalid before an attempted submission.
- Don't communicate status through color alone or replace a load failure with an empty state.

Source of truth: `web/src/styles.css`, shared Layout/Page/Field/Icons components, and representative public/staff routes. The finish evidence in `.impeccable/review/verification.md` and `finish-verdict.md` records the responsive and interaction checks; the verdict ships the scored correction batch, not an exhaustive audit of every route.
