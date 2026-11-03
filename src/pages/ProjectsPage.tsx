import { useState } from "react";
import { motion, type Variants } from "motion/react";
import ProjectCard from "../components/projects/ProjectCard";
import ProjectControls from "../components/projects/ProjectControls";
import { EXIT_EASE, rise } from "../components/ui/motion";
import { GLASS_CARD, GRADIENT_TEXT, OUTLINE_BUTTON } from "../components/ui/styles";
import { orgOptions, queryProjects, techOptions } from "../data/projectQuery";
import { PROJECTS } from "../data/projects";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useProjectQuery } from "../hooks/useProjectQuery";

// Filter options never change.
const ORGS = orgOptions(PROJECTS);
const TECH = techOptions(PROJECTS);

const page: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.35, ease: EXIT_EASE } },
};

/**
 * Masonry: cards are dealt left to right into columns (so newest-first
 * still reads across the top row), and each column stacks at its own
 * height. 3 columns on desktop, 2 on tablets, 1 on phones.
 */
function useColumns() {
  const two = useMediaQuery("(min-width: 768px)");
  const three = useMediaQuery("(min-width: 1024px)");
  return three ? 3 : two ? 2 : 1;
}

export default function ProjectsPage() {
  const cols = useColumns();
  const { query, activeCount, setSort, setMatch, toggleOrg, toggleTech, clear } = useProjectQuery();
  const [open, setOpen] = useState(activeCount > 0);
  const visible = queryProjects(PROJECTS, query);
  const columns = Array.from({ length: cols }, (_, c) => visible.filter((_, i) => i % cols === c));
  // A card's pill or tag filters by it and shows the panel.
  const fromCard = (toggle: (v: string) => void) => (v: string) => {
    toggle(v);
    setOpen(true);
  };

  return (
    <motion.section
      variants={page}
      initial="hidden"
      animate="show"
      exit="exit"
      aria-labelledby="projects-title"
      className="min-h-[100svh] px-4 pt-28 pb-20 sm:px-6 sm:pt-32"
    >
      <div className="mx-auto max-w-7xl">
        <motion.header variants={rise} className="mb-10 text-center sm:mb-14">
          <p className={`mb-2 text-[0.7rem] font-semibold tracking-[0.2em] uppercase sm:mb-3 sm:text-sm ${GRADIENT_TEXT}`}>
            Things I've built
          </p>
          <h1 id="projects-title" className="text-[1.75rem] leading-tight font-bold tracking-tight sm:text-5xl md:text-6xl">
            Projects
          </h1>
        </motion.header>

        <motion.div variants={rise} className="mb-8">
          <ProjectControls
            sort={query.sort}
            onSort={setSort}
            open={open}
            onToggleOpen={() => setOpen((o) => !o)}
            activeCount={activeCount}
            shown={visible.length}
            total={PROJECTS.length}
            onClear={clear}
            orgs={ORGS}
            tech={TECH}
            pickedOrgs={query.orgs}
            pickedTech={query.tech}
            match={query.match}
            onToggleOrg={toggleOrg}
            onToggleTech={toggleTech}
            onMatch={setMatch}
          />
        </motion.div>

        <motion.div variants={rise}>
          {visible.length === 0 ? (
            <div className={`${GLASS_CARD} p-10 text-center`}>
              <p className="mb-4 text-lg text-gray-300">No projects match these filters.</p>
              <button type="button" onClick={clear} className={`${OUTLINE_BUTTON} min-w-0 px-6 py-2`}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-5 lg:gap-6">
              {columns.map((list, c) => (
                <div key={c} className="flex min-w-0 flex-1 flex-col gap-5 lg:gap-6">
                  {list.map((p) => (
                    <ProjectCard
                      key={p.title}
                      project={p}
                      orgPicked={query.orgs.includes(p.org)}
                      techPicked={(t) => query.tech.includes(t)}
                      onOrg={fromCard(toggleOrg)}
                      onTech={fromCard(toggleTech)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.section>
  );
}
