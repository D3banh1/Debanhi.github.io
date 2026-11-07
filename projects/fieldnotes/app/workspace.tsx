'use client';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, LayoutDashboard, Layers, CheckSquare, BarChart3, Plus, ArrowUpRight, ArrowRight, Search, ChevronDown, ChevronRight, X, Check, MoreHorizontal, Download, Leaf, CalendarDays, FileText, ExternalLink, ArrowLeft, CheckCircle2, Clock3, BookMarked, Compass, Menu, Trash2, RefreshCw, FolderOpen, Code2 } from 'lucide-react';
import { STORAGE_KEY, freshSnapshot, readSnapshot, saveSnapshot, parseBackup, type WorkspaceSnapshot } from './persistence';
import { sourceEvent, milestoneEvent, starterData, type Data, type Source, type Project, type Task, type Activity } from './model';
type View = 'Overview' | 'Projects' | 'Literature' | 'Milestones' | 'Analytics' | 'Build journal';
type Modal = {
    kind: 'source';
    item?: Source;
} | {
    kind: 'project';
    item?: Project;
} | {
    kind: 'task';
    item?: Task;
};
const navigation = [{ name: 'Overview', icon: LayoutDashboard }, { name: 'Projects', icon: Layers }, { name: 'Literature', icon: BookOpen }, { name: 'Milestones', icon: CheckSquare }, { name: 'Analytics', icon: BarChart3 }] as const;
const formatDate = (date: string) => date ? new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date';
const uid = () => crypto.randomUUID();
function download(name: string, text: string, mime = 'text/plain') { const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([text], { type: mime })); link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
const csv = (rows: unknown[][]) => rows.map(row => row.map(v => { let s = String(v ?? ''); if (/^[=+@\-\t\r]/.test(s))
    s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; }).join(',')).join('\r\n');
export default function Workspace() {
    const [data, setData] = useState<Data | null>(null);
    const [mode, setMode] = useState<'loading' | 'local' | 'error'>('loading');
    const [events, setEvents] = useState<Activity[]>([]);
    const [view, setView] = useState<View>('Overview'), [query, setQuery] = useState(''), [filter, setFilter] = useState('All sources'), [projectFilter, setProjectFilter] = useState('all'), [modal, setModal] = useState<Modal | null>(null), [toast, setToast] = useState(''), [error, setError] = useState(''), [saving, setSaving] = useState(false), [mobile, setMobile] = useState(false);
    const [pendingImport, setPendingImport] = useState<{data: Data; events: Activity[]} | null>(null);
    const [resetConfirm, setResetConfirm] = useState(false);
    const snapshotRef = useRef<WorkspaceSnapshot | null>(null);
    const started = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lock = useRef(false);
    function tell(message: string) {
        setToast(message);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast(''), 3500);
    }
    function apply(snapshot: WorkspaceSnapshot) {
        snapshotRef.current = snapshot;
        setData(snapshot.data);
        setEvents(snapshot.events);
        setMode('local');
    }
    function persist(next: Data, activity: Activity, history?: Activity[]) {
        if (!snapshotRef.current) throw Error('Your workspace is not ready.');
        const previous = snapshotRef.current;
        apply(saveSnapshot(localStorage, previous, next, [activity, ...(history ?? previous.events)]));
    }
    function load() {
        setMode('loading'); setError('');
        try {
            const previous = readSnapshot(localStorage) ?? freshSnapshot();
            const opened: Activity = {id: uid(), name: 'workspace_opened', entityId: null, createdAt: new Date().toISOString()};
            apply(saveSnapshot(localStorage, previous, previous.data, [opened, ...previous.events]));
        } catch (e) {
            setMode('error');
            setError(e instanceof Error ? e.message : 'Your browser could not open local storage.');
        }
    }
    useEffect(() => {
        if (!started.current) { started.current = true; load(); }
        function changed(event: StorageEvent) {
            if (event.key === STORAGE_KEY) setError('Your workspace changed in another tab. Reload to use the latest version.');
        }
        window.addEventListener('storage', changed);
        return () => { window.removeEventListener('storage', changed); if (timer.current) clearTimeout(timer.current); };
    }, []);
    useEffect(() => {
        function handle(e: KeyboardEvent) { if (e.key === 'Escape') { setModal(null); setMobile(false); } }
        window.addEventListener('keydown', handle);
        return () => window.removeEventListener('keydown', handle);
    }, []);
    function track(name: 'view_opened' | 'data_exported', entityId: string) {
        try { if (snapshotRef.current) persist(snapshotRef.current.data, {id: uid(), name, entityId, createdAt: new Date().toISOString()}); }
        catch (e) { setError(e instanceof Error ? e.message : 'Could not record local activity.'); }
    }
    function navigate(next: View) { setView(next); setQuery(''); setMobile(false); track('view_opened', next); }
    async function commit(next: Data, event: string, entityId: string, message: string) {
        if (lock.current) return false;
        lock.current = true; setSaving(true); setError('');
        try {
            persist(next, {id: uid(), name: event, entityId, createdAt: new Date().toISOString()});
            tell(message); return true;
        } catch (e) { setError(e instanceof Error ? e.message : 'Could not save.'); return false; }
        finally { setSaving(false); lock.current = false; }
    }
    async function importBackup(file: File | undefined) {
        if (!file) return;
        try { if (file.size > 6000000) throw Error('Choose a backup smaller than 6 MB.'); setPendingImport(parseBackup(await file.text())); setError(''); }
        catch(e) { setError(e instanceof Error ? e.message : 'Could not read backup.'); }
    }
    function restoreBackup() {
        if (!pendingImport) return;
        try {
            persist(pendingImport.data, {id: uid(), name:'backup_imported', entityId:null, createdAt:new Date().toISOString()}, pendingImport.events);
            setPendingImport(null); setProjectFilter('all'); setError(''); tell('Backup restored in this browser');
        } catch(e) {setError(e instanceof Error ? e.message : 'Could not restore backup.');}
    }
    function exportBackup() {
        if (!snapshotRef.current) return;
        download('fieldnotes-workspace.json', JSON.stringify(snapshotRef.current, null, 2), 'application/json');
        track('data_exported', 'workspace');
    }
    function recoveryCopy() {
        try { download('fieldnotes-recovery.json', localStorage.getItem(STORAGE_KEY) ?? '{}', 'application/json'); }
        catch {setError('Your browser is blocking storage access. Allow storage for this site, then try again.');}
    }
    function resetBrokenWorkspace() {
        if (!resetConfirm) {setResetConfirm(true); return;}
        try {localStorage.setItem(STORAGE_KEY, JSON.stringify(freshSnapshot())); setResetConfirm(false); load();}
        catch {setError('Your browser could not save a fresh workspace. Check browser storage permissions.');}
    }
    if (!data || mode === 'loading' || mode === 'error')
        return <div className="loading"><div className="brand"><span className="brand-mark"><Leaf size={24}/></span>fieldnotes<span className="brand-dot">.</span></div>{mode === 'error' ? <><h1>Let’s recover your workspace.</h1><p>{error}</p><div className="recovery-actions"><button className="primary" onClick={() => void load()}><RefreshCw size={16}/>Try again</button><button className="secondary" onClick={recoveryCopy}>Download recovery copy</button><button className="secondary" onClick={resetBrokenWorkspace}>{resetConfirm ? "Confirm reset saved work" : "Reset saved workspace"}</button></div></> : <><span className="spinner"/><p>Opening your research workspace…</p></>}</div>;
    const projects = data.projects, sources = data.sources, tasks = data.tasks;
    const projectName = (id: string) => projects.find(p => p.id === id)?.title ?? 'Unassigned';
    const read = sources.filter(s => s.status === 'Read').length, active = projects.filter(p => p.status === 'Active').length, remaining = tasks.filter(t => !t.done).length, notes = sources.filter(s => s.notesFinished).length;
    const selectedSources = sources.filter(s => (filter === 'All sources' || s.status === filter) && (projectFilter === 'all' || s.projectId === projectFilter) && [s.title, s.authors, s.tags].join(' ').toLowerCase().includes(query.toLowerCase()));
    const progress = (id: string) => { const all = tasks.filter(t => t.projectId === id); return all.length ? Math.round(all.filter(t => t.done).length / all.length * 100) : 0; };
    const projectCard = (p: Project) => <button className={'project-card ' + p.color} key={p.id} onClick={() => { setProjectFilter(p.id); navigate('Projects'); }}><div className="project-card-top"><span className="project-symbol"><FolderOpen size={21}/></span><span className="subtle-tag">{p.status}</span></div><span className="eyebrow">{p.category}</span><h3>{p.title}</h3><div className="project-progress"><span>Milestone progress</span><b>{progress(p.id)}%</b></div><div className="progress"><span style={{ width: progress(p.id) + '%' }}/></div><div className="project-footer"><span><BookOpen size={13}/>{sources.filter(s => s.projectId === p.id).length} sources</span><span>{formatDate(p.due)} <ArrowUpRight size={14}/></span></div></button>;
    function exportSources() { download('fieldnotes-sources.csv', csv([['id', 'title', 'authors', 'year', 'type', 'url', 'project', 'status', 'tags', 'planned_use', 'notes', 'notes_finished'], ...selectedSources.map(s => [s.id, s.title, s.authors, s.year, s.type, s.url, projectName(s.projectId), s.status, s.tags, s.use, s.notes, s.notesFinished])]), 'text/csv'); void track('data_exported', 'sources'); tell('Literature CSV exported'); }
    function exportEvents() { download('fieldnotes-events.csv', csv([['id', 'event_name', 'entity_id', 'created_at', 'data_mode'], ...events.map(e => [e.id, e.name, e.entityId, e.createdAt, mode])]), 'text/csv'); void track('data_exported', 'events'); tell('Activity CSV exported'); }
    const filteredProjects = projects.filter(p => (projectFilter === 'all' || p.id === projectFilter) && [p.title, p.category, p.question].join(' ').toLowerCase().includes(query.toLowerCase()));
    const heading = { Overview: ['YOUR RESEARCH, CONNECTED', 'A little clarity. A lot of possibility.'], Projects: ['FROM QUESTIONS TO FINDINGS', 'Make room for your next idea.'], Literature: ['A HOME FOR YOUR THINKING', 'Read widely. Connect the dots.'], Milestones: ['ONE STEP AT A TIME', 'Turn your plans into progress.'], Analytics: ['UNDERSTAND YOUR WORKFLOW', 'See the patterns in your practice.'], 'Build journal': ['YOUR PORTFOLIO STARTS HERE', 'Build, measure, and keep learning.'] }[view];
    const topAction = view === 'Projects' ? () => setModal({ kind: 'project' }) : view === 'Milestones' ? () => setModal({ kind: 'task' }) : () => setModal({ kind: 'source' });
    return <div className="app-shell">
 <aside className={'sidebar ' + (mobile ? 'mobile-open' : '')}><a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('Overview'); }}><span className="brand-mark"><Leaf size={24}/></span>fieldnotes<span className="brand-dot">.</span></a><button className="workspace-switch" onClick={() => navigate('Overview')}><span className="workspace-avatar">F</span><span><b>My research workspace</b><small>Personal workspace</small></span><ChevronDown size={14}/></button><p className="nav-label">WORKSPACE</p><nav>{navigation.map(n => <button className={'nav-item ' + (view === n.name ? 'active' : '')} key={n.name} onClick={() => { setProjectFilter('all'); navigate(n.name); }}><n.icon size={18}/><span>{n.name}</span>{n.name === 'Literature' && <small>{sources.length}</small>}{n.name === 'Milestones' && <small>{remaining}</small>}</button>)}</nav><div className="sidebar-projects"><div className="nav-label">MY PROJECTS<button title="New project" aria-label="New project" onClick={() => setModal({ kind: 'project' })}><Plus size={15}/></button></div>{projects.slice(0, 5).map(p => <button key={p.id} onClick={() => { setProjectFilter(p.id); navigate('Projects'); }}><i className={'dot ' + p.color}/><span>{p.title}</span></button>)}</div><div className="sidebar-bottom"><div className="build-card"><span className="tiny-label"><Compass size={15}/>A SPACE TO GROW</span><p>Good research starts<br />with a little curiosity.</p><button onClick={() => navigate('Build journal')}>Explore the build journal <ArrowUpRight size={14}/></button></div><button className={'nav-item ' + (view === 'Build journal' ? 'active' : '')} onClick={() => navigate('Build journal')}><Code2 size={17}/><span>Build journal</span></button><div className="profile"><span className="profile-avatar">FN</span><div><b>Your workspace</b><small>Research, with intention.</small></div><Leaf size={15}/></div></div></aside>
 <div className="main-shell"><header className="topbar"><div className="breadcrumbs"><button className="mobile-menu icon-button" aria-label="Toggle navigation" onClick={() => setMobile(!mobile)}><Menu size={21}/></button><span>Workspace</span><ChevronRight size={14}/><b>{view}</b></div><div className="top-right"><span className="save-state"><i />{saving ? 'Saving…' : 'Saved in this browser'}</span><span className="top-avatar">FN</span></div></header>
 <main><div className="page-heading"><div><span className="eyebrow">{heading[0]}</span><h1>{view === 'Overview' ? <>Your research, <em>in motion.</em></> : view}</h1><p>{heading[1]}</p></div><div className="heading-action">{view === 'Overview' && <span className="date-label"><CalendarDays size={15}/>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>}<button className="primary" onClick={topAction}><Plus size={17}/>{view === 'Projects' ? 'New project' : view === 'Milestones' ? 'Add milestone' : 'Add source'}</button></div></div>
 <div className="demo-banner"><span><Compass size={16}/><b>No account needed.</b> Your work stays in this browser. Start with the examples or add your own.</span><button className="text-button" onClick={() => navigate('Build journal')}>Backup & restore <ArrowUpRight size={14}/></button></div>
 {error && <div role="alert" className="error-banner">{error}<button onClick={() => void load()}>Reload workspace</button></div>}
 {view === 'Overview' && <>
 <section className="stats-grid" aria-label="Research snapshot">{[{ label: 'Sources collected', value: sources.length, note: 'Ideas worth keeping', icon: BookOpen, color: 'clay', go: 'Literature' }, { label: 'Active projects', value: active, note: 'Questions taking shape', icon: Layers, color: 'sage', go: 'Projects' }, { label: 'Reading completed', value: read, note: sources.length ? Math.round(read / sources.length * 100) + '% of your library' : 'Start your reading list', icon: BookMarked, color: 'lavender', go: 'Literature' }, { label: 'Upcoming milestones', value: remaining, note: 'Your next small steps', icon: CheckSquare, color: 'sand', go: 'Milestones' }].map(stat => <button className="stat" key={stat.label} onClick={() => { setProjectFilter('all'); navigate(stat.go as View); }}><div className="stat-top"><span>{stat.label}</span><span className={'stat-icon ' + stat.color}><stat.icon size={17}/></span></div><strong>{stat.value.toString().padStart(2, '0')}</strong><span className="stat-note">{stat.note}<ArrowUpRight size={14}/></span></button>)}</section>
 <section className="section-block"><div className="section-heading"><div><h2>Ideas taking shape <span>{projects.length}</span></h2><p>A bird’s-eye view of your research.</p></div><button className="text-button" onClick={() => { setProjectFilter('all'); navigate('Projects'); }}>All projects <ArrowRight size={16}/></button></div>{projects.length ? <div className="project-grid">{projects.slice(0, 3).map(projectCard)}</div> : <Empty label="Every project starts with a question." action="Create a project" onClick={() => setModal({ kind: 'project' })}/>}</section>
 <div className="overview-bottom"><section className="panel reading-panel"><div className="section-heading"><div><h2>On your reading list</h2><p>Your next good idea might be in here.</p></div><button className="icon-button" title="Open literature" aria-label="Open literature" onClick={() => navigate('Literature')}><ArrowUpRight size={18}/></button></div><div className="reading-list">{sources.filter(s => s.status !== 'Read').slice(0, 3).map(s => <button className="reading-row" key={s.id} onClick={() => setModal({ kind: 'source', item: s })}><span className={'book-cover ' + (s.status === 'Reading' ? 'clay' : 'sage')}><BookOpen size={20}/></span><span className="reading-info"><b>{s.title}</b><small>{s.authors} · {s.year}</small><span className="source-project">{projectName(s.projectId)}</span></span><span className={'status ' + s.status.toLowerCase().replace(' ', '-')}>{s.status}</span><ChevronRight size={15}/></button>)}</div>{!sources.some(s => s.status !== 'Read') && <Empty label="Your reading queue is clear." action="Find your next source" onClick={() => setModal({ kind: 'source' })}/>}<button className="panel-footer" onClick={() => navigate('Literature')}>Open your literature library <ArrowRight size={15}/></button></section>
 <section className="panel next-panel"><div className="section-heading"><div><h2>Up next</h2><p>Make a little progress today.</p></div><span className="small-icon"><CalendarDays size={18}/></span></div>{tasks.filter(t => !t.done).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 3).map(t => <div className="task-row" key={t.id}><button disabled={saving} className="check-button" aria-label={'Complete ' + t.title} onClick={() => void commit({ ...data, tasks: tasks.map(x => x.id === t.id ? { ...x, done: true } : x) }, 'milestone_completed', t.id, 'Milestone completed')}><Check size={13}/></button><button className="task-info" onClick={() => setModal({ kind: 'task', item: t })}><b>{t.title}</b><small>{projectName(t.projectId)}</small><span className="task-date"><Clock3 size={11}/>{formatDate(t.due)}</span></button></div>)}{!remaining && <Empty label="A clear horizon. Plan your next step." action="Add milestone" onClick={() => setModal({ kind: 'task' })}/>}<button className="panel-footer" onClick={() => navigate('Milestones')}>View all milestones <ArrowRight size={15}/></button></section></div>
 <div className="closing-note"><Leaf size={16}/><span>Big questions. Small steps. Meaningful progress.</span><span className="starter-label">Starter workspace · sample research content</span></div>
 </>}
 {view === 'Projects' && <><div className="toolbar"><div className="search-field"><Search size={17}/><input aria-label="Search projects" placeholder="Find a project…" value={query} onChange={e => setQuery(e.target.value)}/></div><select aria-label="Filter projects" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}><option value="all">All projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div><div className="project-detail-grid">{filteredProjects.map(p => <section className={'project-detail ' + p.color} key={p.id}><div className="project-detail-head"><span className="project-symbol"><FolderOpen size={23}/></span><span className="subtle-tag">{p.status}</span><button className="icon-button" aria-label={'Edit ' + p.title} onClick={() => setModal({ kind: 'project', item: p })}><MoreHorizontal size={20}/></button></div><span className="eyebrow">{p.category}</span><h2>{p.title}</h2><p>{p.question || 'Add a research question to give this project direction.'}</p><div className="project-progress"><span>Milestone progress</span><b>{progress(p.id)}%</b></div><div className="progress"><span style={{ width: progress(p.id) + '%' }}/></div><div className="project-detail-meta"><span><BookOpen size={14}/>{sources.filter(s => s.projectId === p.id).length} sources</span><span><CalendarDays size={14}/>{formatDate(p.due)}</span></div><div className="project-actions"><button onClick={() => { setProjectFilter(p.id); navigate('Literature'); }}>View literature <ArrowRight size={14}/></button><button onClick={() => setModal({ kind: 'project', item: p })}>Edit project</button></div></section>)}</div>{!filteredProjects.length && <Empty label="No projects here yet." action="Create a project" onClick={() => setModal({ kind: 'project' })}/>}</>}
 {view === 'Literature' && <><div className="library-tabs">{['All sources', 'To read', 'Reading', 'Read'].map(f => <button className={filter === f ? 'selected' : ''} key={f} onClick={() => setFilter(f)}>{f}<span>{f === 'All sources' ? sources.length : sources.filter(s => s.status === f).length}</span></button>)}</div><div className="toolbar"><div className="search-field"><Search size={17}/><input aria-label="Search literature" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search titles, authors, or topics…"/></div><select aria-label="Filter by project" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}><option value="all">All projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select><button className="secondary" onClick={exportSources}><Download size={15}/>Export CSV</button></div><div className="table-wrap"><table className="source-table"><thead><tr><th>SOURCE</th><th>PROJECT</th><th>STATUS</th><th>NOTES</th><th><span className="sr-only">Open</span></th></tr></thead><tbody>{selectedSources.map(s => <tr key={s.id}><td><button className="source-title" onClick={() => setModal({ kind: 'source', item: s })}><span className="mini-book"><FileText size={18}/></span><span><b>{s.title}</b><small>{s.authors || 'Author not added'} · {s.year || 'No year'} · {s.type}</small><span className="tag-row">{s.tags.split(',').filter(Boolean).slice(0, 2).map(t => <i key={t}>{t.trim()}</i>)}</span></span></button></td><td><span className="table-project"><i className={'dot ' + (projects.find(p => p.id === s.projectId)?.color ?? 'sage')}/>{projectName(s.projectId)}</span></td><td><select className={'status-select ' + s.status.toLowerCase().replace(' ', '-')} aria-label={'Reading status for ' + s.title} disabled={saving} value={s.status} onChange={e => void commit({ ...data, sources: sources.map(x => x.id === s.id ? { ...x, status: e.target.value as Source['status'] } : x) }, e.target.value === 'Read' ? 'source_read' : 'source_updated', s.id, 'Reading status updated')}><option>To read</option><option>Reading</option><option>Read</option></select></td><td><button className="notes-status" onClick={() => setModal({ kind: 'source', item: s })}>{s.notesFinished ? <><CheckCircle2 size={15}/>Finished</> : s.notes ? <><FileText size={15}/>Draft</> : <span>Add notes</span>}</button></td><td><button className="icon-button" aria-label={'Open ' + s.title} onClick={() => setModal({ kind: 'source', item: s })}><ArrowUpRight size={17}/></button></td></tr>)}</tbody></table></div>{!selectedSources.length && <Empty label="No sources match your search." action="Add a source" onClick={() => setModal({ kind: 'source' })}/>}<p className="table-caption">{selectedSources.length} sources · Select a title to edit notes, links, and planned use.</p></>}
 {view === 'Milestones' && <><div className="toolbar"><div className="search-field"><Search size={17}/><input aria-label="Search milestones" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find your next step…"/></div><select aria-label="Milestone project" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}><option value="all">All projects</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></div>{[false, true].map(done => <section className="milestone-section" key={String(done)}><h2>{done ? 'Completed' : 'On the horizon'}<span>{tasks.filter(t => t.done === done && (projectFilter === 'all' || t.projectId === projectFilter)).length}</span></h2>{tasks.filter(t => t.done === done && (projectFilter === 'all' || t.projectId === projectFilter) && t.title.toLowerCase().includes(query.toLowerCase())).sort((a, b) => a.due.localeCompare(b.due)).map(t => <div className={'milestone-row ' + (done ? 'done' : '')} key={t.id}><button disabled={saving} className={'check-button ' + (done ? 'checked' : '')} aria-label={(done ? 'Reopen ' : 'Complete ') + t.title} onClick={() => void commit({ ...data, tasks: tasks.map(x => x.id === t.id ? { ...x, done: !done } : x) }, done ? 'milestone_updated' : 'milestone_completed', t.id, done ? 'Milestone reopened' : 'Milestone completed')}><Check size={14}/></button><button className="milestone-title" onClick={() => setModal({ kind: 'task', item: t })}><b>{t.title}</b><small>{projectName(t.projectId)}</small></button><span className="milestone-date"><CalendarDays size={14}/>{formatDate(t.due)}</span><button className="icon-button" aria-label={'Edit ' + t.title} onClick={() => setModal({ kind: 'task', item: t })}><MoreHorizontal size={19}/></button></div>)}</section>)}{!tasks.length && <Empty label="Break a big question into small steps." action="Add milestone" onClick={() => setModal({ kind: 'task' })}/>}</>}
 {view === 'Analytics' && <><div className="analytics-notice"><span><BarChart3 size={18}/><b>{'Your workspace activity'}</b> · {'Recorded in this browser only; no activity is sent to an analytics server.'}</span><button className="secondary" onClick={exportEvents}><Download size={15}/>Export events</button></div><div className="stats-grid"><Metric label="Recorded events" value={events.length} note="Up to 5,000 most recent local events"/><Metric label="Sources read" value={read} note="Current library, including starter sources"/><Metric label="Notes finished" value={notes} note="Sources marked notes complete"/><Metric label="Milestones complete" value={tasks.filter(t => t.done).length} note="Current project milestones"/></div><div className="analytics-grid"><section className="panel chart-panel"><div className="section-heading"><div><h2>Your research rhythm</h2><p>Recorded events per day · last 7 days · local time</p></div><span className="subtle-tag">7 days</span></div><div className="bar-chart">{Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const count = events.filter(e => new Date(e.createdAt).toDateString() === d.toDateString()).length; const max = Math.max(1, ...Array.from({ length: 7 }, (_, j) => { const a = new Date(); a.setDate(a.getDate() - 6 + j); return events.filter(e => new Date(e.createdAt).toDateString() === a.toDateString()).length; })); return <div className="bar-column" key={i}><b>{count}</b><div className="bar-track"><span style={{ height: (count / max * 100) + '%' }}/></div><small>{d.toLocaleDateString('en-US', { weekday: 'short' })}</small></div>; })}</div></section><section className="panel chart-panel"><div className="section-heading"><div><h2>From collecting to understanding</h2><p>Current source statuses · sample content included</p></div></div><div className="reading-breakdown">{(['To read', 'Reading', 'Read'] as const).map((status, i) => <div key={status}><div><span><i className={'dot ' + ['sage', 'clay', 'lavender'][i]}/>{status}</span><b>{sources.filter(s => s.status === status).length}</b></div><div className="progress"><span style={{ width: (sources.length ? sources.filter(s => s.status === status).length / sources.length * 100 : 0) + '%', background: ['#8caa94', '#c3795b', '#a19bb9'][i] }}/></div></div>)}</div><p className="metric-definition">Reading completion = sources marked Read ÷ all sources. This describes your library, not product retention.</p></section></div><section className="panel feature-panel"><div className="section-heading"><div><h2>Feature usage</h2><p>Event counts across your recorded activity. These are not funnel conversion rates.</p></div><button className="text-button" onClick={() => navigate('Build journal')}>Metric definitions <ArrowRight size={16}/></button></div><div className="feature-grid">{['project_created', 'source_created', 'source_read', 'milestone_completed'].map(name => <div key={name}><span>{name.replaceAll('_', ' ')}</span><strong>{events.filter(e => e.name === name).length}</strong></div>)}</div></section></>}
 {view === 'Build journal' && <><div className="journal-intro"><span className="project-symbol"><Code2 size={25}/></span><div><h2>A working product. A place to practice.</h2><p>Fieldnotes is your starting point for learning product analytics through a real research workflow.</p></div></div><div className="journal-grid"><section className="panel journal-card"><span className="eyebrow">01 · THE PRODUCT</span><h2>Bring your research together.</h2><p>Create projects, collect sources, write notes, and finish milestones. New workspaces start with sample projects and reading statuses; replace them with your own work.</p><ul><li>React + TypeScript interface</li><li>No account or login required</li><li>Browser storage with backup and restore</li><li>Validated records and local activity tracking</li></ul></section><section className="panel journal-card"><span className="eyebrow">02 · THE MEASUREMENT</span><h2>Ask a question you can answer.</h2><p>Start with: which actions help a new researcher build a useful workspace?</p><ul><li>Activation: create a project and a source within 7 days of the first visit.</li><li>Retention: return on day 7 after the first visit.</li><li>Guardrail: monitor saving errors and incomplete records.</li></ul><p className="muted">These are proposed study metrics. This version shows your own recorded activity; it cannot establish causal effects or population retention.</p></section><section className="panel journal-card"><span className="eyebrow">03 · YOUR FIRST ANALYSIS</span><h2>Take the data into SQL and R.</h2><p>Use the exports to practice cleaning timestamps, counting feature usage, and checking how results change with metric definitions.</p><button className="secondary" onClick={exportEvents}><Download size={15}/>Export event data</button><button className="secondary" onClick={exportBackup}><Download size={15}/>Export full backup</button><label className="secondary import-button">Import backup<input type="file" accept=".json,application/json" onChange={e => {void importBackup(e.target.files?.[0]); e.target.value='';}}/></label><p className="muted">Clearing browser data or using another device will not carry your work over. Export a backup regularly and import it to move your workspace. Exports include your research notes.</p></section><section className="panel journal-card"><span className="eyebrow">04 · YOUR BUILD JOURNAL</span><h2>Make the next iteration yours.</h2><p>Practice a small improvement, explain your decision, and measure the result.</p><ol><li>Write three SQL queries using your exported events.</li><li>Identify a point of friction in adding a source.</li><li>Change one part of the form and document why.</li><li>Write a one-page findings memo with limitations.</li></ol><a className="text-button" href="https://github.com/D3banh1/Debanhi.github.io" target="_blank" rel="noreferrer">Your GitHub <ArrowUpRight size={15}/></a></section></div></>}
 {pendingImport && <section className="import-review" role="region" aria-label="Review backup"><h2>Restore this backup?</h2><p>{pendingImport.data.projects.length} projects, {pendingImport.data.sources.length} sources, and {pendingImport.data.tasks.length} milestones will replace this browser’s current workspace.</p><div><button className="secondary" onClick={exportBackup}>Back up current work</button><button className="secondary" onClick={() => setPendingImport(null)}>Cancel</button><button className="primary" onClick={restoreBackup}>Replace workspace</button></div></section>}
 </main><footer className="app-footer"><span>fieldnotes<span className="brand-dot">.</span> <span>A thoughtful place for your research.</span></span><span>Made for the questions that matter.</span></footer></div>
 {modal && <Editor modal={modal} data={data} busy={saving} error={error} onClose={() => { if (!saving) {
        setModal(null);
        setError('');
    } }} onSave={async (item, kind) => { let next: Data; let event: string; if (kind === 'source') {
        const s = item as Source;
        const exists = sources.some(x => x.id === s.id);
        next = { ...data, sources: exists ? sources.map(x => x.id === s.id ? s : x) : [s, ...sources] };
        event = sourceEvent(sources.find(x => x.id === s.id), s);
    }
    else if (kind === 'project') {
        const p = item as Project;
        const exists = projects.some(x => x.id === p.id);
        next = { ...data, projects: exists ? projects.map(x => x.id === p.id ? p : x) : [...projects, p] };
        event = exists ? 'project_updated' : 'project_created';
    }
    else {
        const t = item as Task;
        const exists = tasks.some(x => x.id === t.id);
        next = { ...data, tasks: exists ? tasks.map(x => x.id === t.id ? t : x) : [...tasks, t] };
        event = milestoneEvent(tasks.find(x => x.id === t.id), t);
    } if (await commit(next, event, item.id, 'Your ' + kind + ' is ' + ('saved in this browser')))
        setModal(null); }} onDelete={async (id, kind) => { let next = { ...data }; if (kind === 'source')
        next.sources = sources.filter(x => x.id !== id);
    else if (kind === 'task')
        next.tasks = tasks.filter(x => x.id !== id);
    else
        next = { projects: projects.filter(x => x.id !== id), sources: sources.map(x => x.projectId === id ? { ...x, projectId: '' } : x), tasks: tasks.map(x => x.projectId === id ? { ...x, projectId: '' } : x) }; if (await commit(next, 'record_deleted', id, 'Record deleted'))
        setModal(null); }}/>}
 {toast && <div role="status" className="toast"><CheckCircle2 size={18}/>{toast}</div>}
 </div>;
}
function Metric({ label, value, note }: {
    label: string;
    value: number;
    note: string;
}) { return <div className="stat"><div className="stat-top"><span>{label}</span></div><strong>{value}</strong><span className="stat-note">{note}</span></div>; }
function Empty({ label, action, onClick }: {
    label: string;
    action: string;
    onClick: () => void;
}) { return <div className="empty"><BookOpen size={25}/><p>{label}</p><button className="text-button" onClick={onClick}>{action}<Plus size={15}/></button></div>; }
function Editor({ modal, data, busy, error, onClose, onSave, onDelete }: {
    modal: Modal;
    data: Data;
    busy: boolean;
    error: string;
    onClose: () => void;
    onSave: (item: Source | Project | Task, kind: Modal['kind']) => Promise<void>;
    onDelete: (id: string, kind: Modal['kind']) => Promise<void>;
}) {
    const [form, setForm] = useState<Record<string, any>>(() => modal.item ? { ...modal.item } : modal.kind === 'source' ? { id: uid(), title: '', authors: '', year: '', type: 'Journal article', url: '', projectId: '', status: 'To read', tags: '', notes: '', use: '', notesFinished: false } : modal.kind === 'project' ? { id: uid(), title: '', question: '', category: '', status: 'Active', due: '', color: 'sage' } : { id: uid(), title: '', projectId: '', due: '', done: false });
    const [deleting, setDeleting] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const lastFocus = useRef<HTMLElement | null>(null);
    useEffect(() => { lastFocus.current = document.activeElement as HTMLElement; const input = ref.current?.querySelector<HTMLInputElement>('input'); input?.focus(); function trap(e: KeyboardEvent) { if (e.key !== 'Tab')
        return; const els = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]') ?? []); const first = els[0], last = els[els.length - 1]; if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
    }
    else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
    } } document.addEventListener('keydown', trap); return () => { document.removeEventListener('keydown', trap); lastFocus.current?.focus(); }; }, []);
    const set = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));
    const field = (name: string, key: string, placeholder = '', type = 'text', required = false) => <label>{name}<input type={type} required={required} maxLength={key === 'year' ? 4 : key === 'title' ? modal.kind === 'project' ? 200 : 500 : 2000} value={form[key] ?? ''} onChange={e => set(key, e.target.value)} placeholder={placeholder}/></label>;
    const projectSelect = <label>Project<select value={form.projectId} onChange={e => set('projectId', e.target.value)}><option value="">Unassigned</option>{data.projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>;
    return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget && !busy)
        onClose(); }}><div ref={ref} className="editor" role="dialog" aria-modal="true" aria-labelledby="editor-heading"><div className="editor-top"><span className="eyebrow">MAKE SPACE FOR A GOOD IDEA</span><button className="icon-button" disabled={busy} aria-label="Close editor" onClick={onClose}><X size={21}/></button></div><h2 id="editor-heading">{modal.item ? 'Edit' : modal.kind === 'source' ? 'Add a' : modal.kind === 'project' ? 'Start a' : 'Add a'} {modal.kind === 'task' ? 'milestone' : modal.kind}</h2><p className="editor-subtitle">{modal.kind === 'source' ? 'Keep the source, the context, and your own thinking together.' : modal.kind === 'project' ? 'Give your research question a place to grow.' : 'A meaningful next step toward a bigger question.'}</p><form onSubmit={e => { e.preventDefault(); void onSave(form as Source | Project | Task, modal.kind); }}><fieldset disabled={busy}>
 {field(modal.kind === 'source' ? 'Source title' : 'Title', 'title', modal.kind === 'source' ? 'What are you reading?' : 'What are you working toward?', 'text', true)}
 {modal.kind === 'source' && <>{field('Authors', 'authors', 'Author names')}<div className="form-grid">{field('Year', 'year', '2026')}<label>Source type<select value={form.type} onChange={e => set('type', e.target.value)}>{['Journal article', 'Book', 'Working paper', 'Report', 'Dataset', 'Website', 'Other'].map(t => <option key={t}>{t}</option>)}</select></label></div>{projectSelect}<div className="form-grid"><label>Reading status<select value={form.status} onChange={e => set('status', e.target.value)}><option>To read</option><option>Reading</option><option>Read</option></select></label>{field('Topics', 'tags', 'Institutions, Gender')}</div>{field('PDF or source URL', 'url', 'https://…', 'url')}<label>How will you use it?<textarea maxLength={12000} rows={2} value={form.use} onChange={e => set('use', e.target.value)} placeholder="Theory, evidence, methods, or a question to explore…"/></label><label>Research notes<textarea maxLength={12000} rows={5} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Your arguments, connections, and questions…"/></label><label className="checkbox-label"><input type="checkbox" checked={form.notesFinished} onChange={e => set('notesFinished', e.target.checked)}/>My notes are finished</label>{form.url && /^https?:\/\//i.test(form.url) && <a className="text-button" href={form.url} target="_blank" rel="noreferrer">Open source <ExternalLink size={14}/></a>}</>}
 {modal.kind === 'project' && <><label>Research question<textarea maxLength={12000} rows={3} value={form.question} onChange={e => set('question', e.target.value)} placeholder="What do you want to understand?"/></label>{field('Research area', 'category', 'Comparative politics')}<div className="form-grid"><label>Status<select value={form.status} onChange={e => set('status', e.target.value)}><option>Active</option><option>Planning</option><option>Complete</option></select></label>{field('Target date', 'due', '', 'date')}</div><label>Project color<select value={form.color} onChange={e => set('color', e.target.value)}><option value="sage">Sage</option><option value="clay">Terracotta</option><option value="lavender">Lavender</option></select></label></>}
 {modal.kind === 'task' && <>{projectSelect}{field('Target date', 'due', '', 'date')}<label className="checkbox-label"><input type="checkbox" checked={form.done} onChange={e => set('done', e.target.checked)}/>Completed</label></>}
 </fieldset>{error && <p role="alert" className="form-error">{error}</p>}<div className="editor-actions">{modal.item && <button className="delete-button" type="button" disabled={busy} onClick={() => deleting ? void onDelete(form.id, modal.kind) : setDeleting(true)}><Trash2 size={15}/>{deleting ? 'Confirm delete' : 'Delete'}</button>}<button type="button" className="secondary" onClick={onClose} disabled={busy}>Cancel</button><button type="submit" className="primary" disabled={busy}>{busy ? 'Saving…' : modal.item ? 'Save changes' : 'Create ' + (modal.kind === 'task' ? 'milestone' : modal.kind)}<ArrowRight size={16}/></button></div>{deleting && <p className="delete-note">{modal.kind === 'project' ? 'Sources and milestones will become unassigned. Select Confirm delete to remove the project.' : 'Select Confirm delete to permanently remove this record.'}</p>}</form></div></div>;
}
