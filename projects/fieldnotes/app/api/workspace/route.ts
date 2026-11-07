import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { workspaces, events } from '../../../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { starterData, eventNames } from '../../model';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
const str = z.string().max(12000);
const project = z.object({ id: z.string().max(100), title: z.string().min(1).max(200), question: str, category: str, status: z.enum(['Active', 'Planning', 'Complete']), due: z.string().max(10), color: z.enum(['sage', 'clay', 'lavender']) });
const source = z.object({ id: z.string().max(100), title: z.string().min(1).max(500), authors: str, year: z.string().max(4), type: str, url: z.string().max(2000).refine(x => !x || /^https?:\/\//i.test(x), 'Use an http or https URL'), projectId: z.string().max(100), status: z.enum(['To read', 'Reading', 'Read']), tags: str, notes: str, use: str, notesFinished: z.boolean() });
const task = z.object({ id: z.string().max(100), title: z.string().min(1).max(500), projectId: z.string().max(100), due: z.string().max(10), done: z.boolean() });
const dataSchema = z.object({ projects: z.array(project).max(300), sources: z.array(source).max(2000), tasks: z.array(task).max(2000) }).refine(d => d.sources.every(s => !s.projectId || d.projects.some(p => p.id === s.projectId)) && d.tasks.every(t => !t.projectId || d.projects.some(p => p.id === t.projectId)), { message: 'Invalid project reference' }).refine(d => [d.projects, d.sources, d.tasks].every(a => new Set(a.map(x => x.id)).size === a.length), { message: 'Duplicate IDs' });
const response = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET() {
    try {
        const user = await getChatGPTUser();
        if (!user)
            return response({ mode: 'demo', data: starterData(), events: [], version: 0 });
        const db = getDb();
        await db.insert(workspaces).values({ userId: user.userId, data: JSON.stringify(starterData()), updatedAt: new Date().toISOString() }).onConflictDoNothing();
        const [w] = await db.select().from(workspaces).where(eq(workspaces.userId, user.userId));
        const activity = await db.select({ id: events.id, name: events.name, entityId: events.entityId, createdAt: events.createdAt }).from(events).where(eq(events.userId, user.userId)).orderBy(desc(events.createdAt)).limit(10000);
        return response({ mode: 'saved', data: JSON.parse(w.data), events: activity, version: w.version });
    }
    catch {
        return response({ error: 'Your workspace could not be loaded. Please try again.' }, 503);
    }
}
export async function PUT(req: Request) {
    try {
        const user = await getChatGPTUser();
        if (!user)
            return response({ error: 'Sign in to save your workspace.' }, 401);
        if (req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin)
            return response({ error: 'Invalid origin' }, 403);
        const raw = await req.text();
        if (raw.length > 2000000)
            return response({ error: 'Workspace is too large.' }, 413);
        const parsed = z.object({ data: dataSchema, version: z.number().int().nonnegative(), event: z.enum(eventNames), entityId: z.string().max(100).nullable().optional() }).safeParse(JSON.parse(raw));
        if (!parsed.success)
            return response({ error: 'Please check the record fields and try again.' }, 400);
        const { data, version, event, entityId } = parsed.data;
        const db = getDb();
        const updated = await db.update(workspaces).set({ data: JSON.stringify(data), version: version + 1, updatedAt: new Date().toISOString() }).where(and(eq(workspaces.userId, user.userId), eq(workspaces.version, version))).returning({ version: workspaces.version });
        if (!updated.length)
            return response({ error: 'This workspace changed in another tab. Reload before saving.' }, 409);
        const activity = { id: crypto.randomUUID(), name: event, entityId: entityId ?? null, createdAt: new Date().toISOString() };
        let recorded = true;
        try {
            await db.insert(events).values({ ...activity, userId: user.userId });
        }
        catch {
            recorded = false;
        }
        return response({ version: version + 1, activity: recorded ? activity : null });
    }
    catch {
        return response({ error: 'The change could not be saved. Please try again.' }, 500);
    }
}
