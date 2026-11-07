-- SQLite / Cloudflare D1. All examples are descriptive, not causal.

-- 1. Daily feature usage. COUNT(*) counts actions, not people.
SELECT date(created_at) AS day, name AS event_name, COUNT(*) AS events
FROM events GROUP BY 1, 2 ORDER BY 1, 2;

-- 2. Seven-day activation: project AND source creation after the first visit.
-- Excludes users without a full seven-day observation window.
WITH first_visits AS (
 SELECT user_id, MIN(created_at) AS first_visit
 FROM events WHERE name = 'workspace_opened' GROUP BY user_id
), eligible AS (
 SELECT * FROM first_visits WHERE datetime(first_visit, '+7 days') <= datetime('now')
), flags AS (
 SELECT f.user_id,
 MAX(CASE WHEN e.name='project_created' THEN 1 ELSE 0 END) AS project,
 MAX(CASE WHEN e.name='source_created' THEN 1 ELSE 0 END) AS source
 FROM eligible f LEFT JOIN events e ON f.user_id=e.user_id
 AND datetime(e.created_at)>=datetime(f.first_visit)
 AND datetime(e.created_at)<datetime(f.first_visit,'+7 days')
 GROUP BY f.user_id
)
SELECT COUNT(*) AS eligible_users,
 SUM(CASE WHEN project=1 AND source=1 THEN 1 ELSE 0 END) AS activated_users,
 ROUND(100.0 * SUM(CASE WHEN project=1 AND source=1 THEN 1 ELSE 0 END)
 / NULLIF(COUNT(*),0),2) AS activation_pct FROM flags;

-- 3. Day-seven return: a workspace_opened event in [168,192) hours
-- after the first visit. Excludes incomplete eight-day observation windows.
WITH first_visits AS (
 SELECT user_id, MIN(created_at) AS first_visit
 FROM events WHERE name='workspace_opened' GROUP BY user_id
), returns AS (
 SELECT f.user_id, MAX(CASE WHEN e.id IS NOT NULL THEN 1 ELSE 0 END) AS returned
 FROM first_visits f LEFT JOIN events e ON f.user_id=e.user_id
 AND e.name='workspace_opened'
 AND datetime(e.created_at)>=datetime(f.first_visit,'+7 days')
 AND datetime(e.created_at)<datetime(f.first_visit,'+8 days')
 WHERE datetime(f.first_visit,'+8 days')<=datetime('now')
 GROUP BY f.user_id
)
SELECT COUNT(*) AS eligible_users,SUM(returned) AS returned_users,
 ROUND(100.0*SUM(returned)/NULLIF(COUNT(*),0),2) AS day7_return_pct FROM returns;

-- 4. Library composition. Starter records are included; this does not
-- establish actual reading behavior or product adoption.
SELECT json_extract(s.value,'$.status') AS status,COUNT(*) AS sources
FROM workspaces w,json_each(w.data,'$.sources') s GROUP BY 1;
