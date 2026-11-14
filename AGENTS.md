# Team Aetherion collaboration

- Preserve collaborators' work. Inspect status, branches, remotes and relevant files first.
- Abdullah works on `backend/abdullah`: API, schemas, scientific calculations, geographic adapter.
- Rhido owns NASA ingestion, cleaned data, catalog, caching, precomputed artifacts, deployment.
- Waseel owns wizard, verdict, years-to-significance and scientific validation support.
- Aayan owns frontend; Ayesha owns research and validated demonstration cases.
- Never label synthetic data as observations. Keep provenance in every data response.
- Run backend pytest from `backend/` before delivery. Document scientific limitations.
- Do not push, merge, or open a PR without Abdullah's approval.
- The permanent workspace is Desktop/Nasa-Space-Apps-Challenge-Team-Aetherion;
  Desktop/NASA is retained historical work, not the active checkout.
- NASA sample utilities are small integration checks; do not expand them into
  Rhido's production ingestion without coordination. Tests must work offline.
- Preserve data_kind=reanalysis and point-sample limitations when using the POWER
  example; scientific validation is separate from a passing software test.
