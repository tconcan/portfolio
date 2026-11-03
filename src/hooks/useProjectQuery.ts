import { useSearchParams } from "react-router";
import { isSort, type ProjectQuery, type Sort, type TechMatch } from "../data/projectQuery";

/**
 * Projects page sort and filters, kept in the URL
 * (?sort=…&org=…&tech=…&match=any) so a filtered view can be shared.
 * Defaults (newest, match all) stay out of the URL.
 */
export function useProjectQuery() {
  const [params, setParams] = useSearchParams();
  const sort = params.get("sort");
  const query: ProjectQuery = {
    sort: isSort(sort) ? sort : "newest",
    orgs: params.getAll("org"),
    tech: params.getAll("tech"),
    match: params.get("match") === "any" ? "any" : "all",
  };

  const update = (change: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    change(next);
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const toggle = (key: "org" | "tech", value: string) =>
    update((next) => {
      const values = next.getAll(key);
      next.delete(key);
      (values.includes(value) ? values.filter((v) => v !== value) : [...values, value]).forEach((v) => next.append(key, v));
    });

  return {
    query,
    activeCount: query.orgs.length + query.tech.length,
    setSort: (s: Sort) => update((next) => (s === "newest" ? next.delete("sort") : next.set("sort", s))),
    setMatch: (m: TechMatch) => update((next) => (m === "all" ? next.delete("match") : next.set("match", m))),
    toggleOrg: (org: string) => toggle("org", org),
    toggleTech: (tech: string) => toggle("tech", tech),
    clear: () =>
      update((next) => {
        next.delete("org");
        next.delete("tech");
        next.delete("match");
      }),
  };
}
