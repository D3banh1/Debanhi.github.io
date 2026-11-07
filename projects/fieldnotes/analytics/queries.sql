-- SQLite queries for your own browser exports. No user identifiers are collected.
-- Import fieldnotes-events.csv into an events table using the CSV header names.
-- Import fieldnotes-sources.csv into a sources table using its header names.

-- 1. Daily activity. Dates are UTC; the in-app chart uses local calendar dates.
SELECT date(created_at) AS day,event_name,COUNT(*) AS events
FROM events GROUP BY 1,2 ORDER BY 1,2;

-- 2. Feature usage. Counts actions, not people or conversion rates.
SELECT event_name,COUNT(*) AS actions
FROM events
WHERE event_name IN ('project_created','source_created','source_read','milestone_completed')
GROUP BY event_name ORDER BY actions DESC;

-- 3. Reading progress describes the current library, including example records.
SELECT COUNT(*) AS total_sources,
 SUM(CASE WHEN status='Read' THEN 1 ELSE 0 END) AS sources_read,
 ROUND(100.0*SUM(CASE WHEN status='Read' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),2) AS pct_read
FROM sources;
