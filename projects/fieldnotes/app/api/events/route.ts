import { getChatGPTUser } from '../../chatgpt-auth';
import { getDb } from '../../../db';
import { events } from '../../../db/schema';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
    const user = await getChatGPTUser();
    if (!user)
        return Response.json({ error: 'Sign in required' }, { status: 401 });
    if (req.headers.get('origin') && req.headers.get('origin') !== new URL(req.url).origin)
        return Response.json({ error: 'Invalid origin' }, { status: 403 });
    try {
        const raw = await req.text();
        if (raw.length > 1000)
            return new Response(null, { status: 413 });
        const parsed = z.object({ name: z.enum(['workspace_opened', 'view_opened', 'data_exported']), entityId: z.string().max(100).nullable().optional() }).safeParse(JSON.parse(raw));
        if (!parsed.success)
            return new Response(null, { status: 400 });
        const activity = { id: crypto.randomUUID(), name: parsed.data.name, entityId: parsed.data.entityId ?? null, createdAt: new Date().toISOString() };
        await getDb().insert(events).values({ ...activity, userId: user.userId });
        return Response.json({ activity }, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch {
        return Response.json({ error: 'Activity could not be recorded' }, { status: 503 });
    }
}
