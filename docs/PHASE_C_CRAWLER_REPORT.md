# Phase C Crawler Implementation Report

## Overview

Phase C establishes the foundational website crawling, content extraction, and content cleaning infrastructure for the AI Chatbot platform. This phase implements strict SSRF protections, ensures crawler processes remain confined to predefined origins, and sanitizes fetched HTML into clean Markdown for future vectorization.

## Architecture

The `CrawlerModule` consists of specialized services orchestrated by the `CrawlerService` background loop:

### 1. Security & Policies

- **`UrlPolicyService`**: Responsible for determining if a given URL path is safe to crawl (blocks state-mutating paths like `/logout`, `/cart`, `/admin`). It enforces mandatory SSRF protections by resolving DNS hostnames and explicitly blocking private IPv4, loopback, link-local, and cloud metadata IP ranges via `ipaddr.js`.
- **`UrlNormalizationService`**: Normalizes URLs by removing tracking parameters, fragments, standardizing trailing slashes, and verifying cross-origin boundaries.

### 2. Fetching & Discovery

- **`PageFetchService`**: A safe HTTP client wrapper using Axios. It enforces strict time limits (10s), content size limits (5MB max), and manually handles redirects (max 5) to ensure every hop passes the `UrlPolicyService` SSRF checks.
- **`RobotsService`**: Reads and respects the origin's `robots.txt` directives.
- **`SitemapService`**: Extracts seed URLs from `sitemap.xml` for accelerated discovery.

### 3. Extraction & Processing

- **`HtmlExtractionService`**: Cleans HTML by stripping `script`, `style`, `iframe`, and semantic noise (`nav`, `footer`, etc.). It coordinates subordinate extraction services.
- **`StructuredDataService`**: Extracts Schema.org JSON-LD definitions.
- **`ImageMetadataService`**: Extracts alt-text, titles, and captions for images.
- **`ContactExtractionService`**: Extracts emails and phone numbers via Regex and DOM links (`mailto:`, `tel:`).

### 4. Conversion & Storage

- **`MarkdownService`**: Utilizes `turndown` to convert sanitized HTML into high-quality Markdown, prepending essential front matter.
- **`ContentDeduplicationService`**: Generates SHA-256 hashes of the resulting Markdown.
- **`CrawlJobService`**: Coordinates database states across `crawl_jobs`, `website_pages`, and `contact_records`.

## Quality Gates Verified

✅ **SSRF Protection:** `UrlPolicyService` correctly intercepts and rejects `127.0.0.1`, `localhost`, `10.x.x.x`, `192.168.x.x`, and `169.254.x.x` endpoints both implicitly and after DNS resolution.
✅ **Same-Origin Constraint:** The crawler strictly aborts on cross-origin links and cross-origin redirects.
✅ **Constraints Enforced:** Timeouts, response size caps, and redirect limits are successfully handled by `PageFetchService`.
✅ **Data Types and Migrations:** `PhaseCCrawler` migration applied successfully. No `any` types were used unsafely.
✅ **Testing and Types:** Unit test coverage handles normalizations, SSRF mocks, extraction limits, and controllers. Run results: `Test Files 12 passed`, `Tests 62 passed`. Lint and TypeScript checks are green.

## Next Steps

Phase C implementation is complete. The system is now capable of securely scraping websites and generating pristine Markdown representations. The next logical phase is to embed this Markdown data and store it inside a Vector database for semantic retrieval, leading into Phase D.
