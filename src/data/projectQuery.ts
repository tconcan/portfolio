// Sorting and filtering for the Projects page.

import type { Org, Project } from "./projects";

export const SORTS = { newest: "Newest", oldest: "Oldest", title: "A–Z" } as const;
export type Sort = keyof typeof SORTS;
export type TechMatch = "all" | "any";

export interface ProjectQuery {
  sort: Sort;
  orgs: readonly string[];
  tech: readonly string[];
  match: TechMatch;
}

export const isSort = (v: string | null): v is Sort => v !== null && Object.hasOwn(SORTS, v);

/**
 * Filter, then sort. Any picked organization matches; picked technologies
 * must all be used (or any of them, with match "any"). Both groups apply.
 */
export function queryProjects(projects: readonly Project[], q: ProjectQuery): Project[] {
  const shown = projects.filter((p) => {
    const orgOk = !q.orgs.length || q.orgs.includes(p.org);
    const uses = (t: string) => p.tech.includes(t);
    const techOk = !q.tech.length || (q.match === "all" ? q.tech.every(uses) : q.tech.some(uses));
    return orgOk && techOk;
  });
  const byTitle = (a: Project, b: Project) => a.title.localeCompare(b.title);
  return shown.sort((a, b) => {
    if (q.sort === "title") return byTitle(a, b);
    const byDate = q.sort === "oldest" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    return byDate || byTitle(a, b);
  });
}

export interface Option {
  value: string;
  count: number;
}

const counts = (values: readonly string[]) => {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
};

/** Organizations in a fixed order, only those with projects. */
const ORG_ORDER: Org[] = ["Purdue", "Milwaukee Tool", "Rogers Imaging", "es@p", "Personal", "Hackathon"];
export function orgOptions(projects: readonly Project[]): Option[] {
  const c = counts(projects.map((p) => p.org));
  return ORG_ORDER.filter((o) => c.has(o)).map((o) => ({ value: o, count: c.get(o)! }));
}

/** Technologies, most used first, then A–Z. */
export function techOptions(projects: readonly Project[]): Option[] {
  return [...counts(projects.flatMap((p) => p.tech))]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}
