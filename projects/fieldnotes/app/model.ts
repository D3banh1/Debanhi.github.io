export type Project = {
    id: string;
    title: string;
    question: string;
    category: string;
    status: 'Active' | 'Planning' | 'Complete';
    due: string;
    color: string;
};
export type Source = {
    id: string;
    title: string;
    authors: string;
    year: string;
    type: string;
    url: string;
    projectId: string;
    status: 'To read' | 'Reading' | 'Read';
    tags: string;
    notes: string;
    use: string;
    notesFinished: boolean;
};
export type Task = {
    id: string;
    title: string;
    projectId: string;
    due: string;
    done: boolean;
};
export type Data = {
    projects: Project[];
    sources: Source[];
    tasks: Task[];
};
export type Activity = {
    id: string;
    name: string;
    createdAt: string;
    entityId: string | null;
};
export const eventNames = ['backup_imported', 'workspace_opened', 'project_created', 'project_updated', 'source_created', 'source_updated', 'source_read', 'milestone_created', 'milestone_updated', 'milestone_completed', 'data_exported', 'view_opened', 'record_deleted'] as const;
export function starterData(): Data {
    const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
    return { projects: [
            { id: 'p1', title: 'Institutions & community governance', question: 'How do local institutions shape the provision of public goods?', category: 'Comparative politics', status: 'Active', due: day(28), color: 'sage' },
            { id: 'p2', title: 'Representation & women’s security', question: 'When does representation translate into institutional responsiveness?', category: 'Gender & institutions', status: 'Active', due: day(40), color: 'clay' },
            { id: 'p3', title: 'Digital participation & trust', question: 'What makes people return to a new civic participation platform?', category: 'Product research', status: 'Planning', due: day(56), color: 'lavender' }
        ], sources: [
            { id: 's1', title: 'Institutions, Institutional Change and Economic Performance', authors: 'Douglass C. North', year: '1990', type: 'Book', url: '', projectId: 'p1', status: 'Reading', tags: 'Institutions, Theory', notes: 'Example note: distinguish formal rules from informal constraints.', use: 'Develop the theoretical framework.', notesFinished: false },
            { id: 's2', title: 'Governing the Commons', authors: 'Elinor Ostrom', year: '1990', type: 'Book', url: '', projectId: 'p1', status: 'Read', tags: 'Governance, Collective action', notes: 'Example note: compare institutional arrangements across cases.', use: 'Identify dimensions for comparative coding.', notesFinished: true },
            { id: 's3', title: 'The Concept of Representation', authors: 'Hanna Fenichel Pitkin', year: '1967', type: 'Book', url: '', projectId: 'p2', status: 'To read', tags: 'Representation, Theory', notes: '', use: 'Clarify descriptive and substantive representation.', notesFinished: false },
            { id: 's4', title: 'Democracy and Its Critics', authors: 'Robert A. Dahl', year: '1989', type: 'Book', url: '', projectId: 'p1', status: 'To read', tags: 'Democracy, Participation', notes: '', use: 'Conceptualize political inclusion.', notesFinished: false },
            { id: 's5', title: 'Exit, Voice, and Loyalty', authors: 'Albert O. Hirschman', year: '1970', type: 'Book', url: '', projectId: 'p3', status: 'Read', tags: 'Participation, Behavior', notes: 'Example note: consider voice and exit as distinct responses.', use: 'Generate hypotheses about user participation.', notesFinished: true },
            { id: 's6', title: 'Making Democracy Work', authors: 'Robert D. Putnam', year: '1993', type: 'Book', url: '', projectId: 'p3', status: 'Reading', tags: 'Trust, Institutions', notes: '', use: 'Explore social trust and participation.', notesFinished: false }
        ], tasks: [
            { id: 't1', title: 'Refine the research question', projectId: 'p1', due: day(-3), done: true },
            { id: 't2', title: 'Draft the institutional coding framework', projectId: 'p1', due: day(2), done: false },
            { id: 't3', title: 'Write a one-page literature synthesis', projectId: 'p2', due: day(4), done: false },
            { id: 't4', title: 'Define participation and retention metrics', projectId: 'p3', due: day(6), done: false },
            { id: 't5', title: 'Build the initial reading list', projectId: 'p2', due: day(-2), done: true },
            { id: 't6', title: 'Outline the comparative case strategy', projectId: 'p1', due: day(9), done: false }
        ] };
}

// Record the same transition regardless of which editor the user uses.
export function sourceEvent(previous: Source | undefined, next: Source): string {
  if (!previous) return 'source_created';
  return previous.status !== 'Read' && next.status === 'Read' ? 'source_read' : 'source_updated';
}
export function milestoneEvent(previous: Task | undefined, next: Task): string {
  if (!previous) return 'milestone_created';
  return !previous.done && next.done ? 'milestone_completed' : 'milestone_updated';
}
