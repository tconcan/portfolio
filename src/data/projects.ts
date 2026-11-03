// Projects page content. Newest first (by completion month).

export type Org = "Purdue" | "Milwaukee Tool" | "es@p" | "Rogers Imaging" | "Personal" | "Hackathon";

export interface ProjectLink {
  label: string;
  href: string;
}

export interface Project {
  title: string;
  org: Org;
  /** Completion month, "YYYY-MM". */
  date: string;
  summary: string;
  tech: readonly string[];
  links: readonly ProjectLink[];
  /** Card image (the poster frame for animated projects), with its size. */
  image: { src: string; width: number; height: number; alt: string };
  /** Muted looping clip that replaces the image once it's on screen. */
  video?: string;
}

const M = "/media/projects";

export const PROJECTS: readonly Project[] = [
  {
    title: "DoodleBot",
    org: "Purdue",
    date: "2025-12",
    summary:
      "A palm-sized robot that draws pictures on a whiteboard, and wipes them off again, on its own. Give it an image and a Python pipeline traces the edges, plans the shortest stroke order, and turns it into G-code. A Raspberry Pi 5 watches the board through a camera, tracks the robot by its ArUco markers, and streams course-corrected moves over Bluetooth. On board, Zephyr firmware on a custom PCB drives two steppers, a marker servo and an eraser servo, all in a 3D-printed shell. Built by a team of five; I wrote the pathfinding.",
    tech: ["Python", "Computer Vision", "Embedded C", "Algorithms"],
    links: [],
    image: { src: `${M}/doodlebot-poster.webp`, width: 640, height: 400, alt: "DoodleBot driving across a whiteboard beside its drawing" },
    video: `${M}/doodlebot.mp4`,
  },

  {
    title: "Dual-Core RISC-V Processor",
    org: "Purdue",
    date: "2025-12",
    summary:
      "A semester-long build with a partner in SystemVerilog: we started from a single-cycle core and ended with a dual-core system. Along the way it gained a five-stage pipeline with forwarding and hazard detection, instruction and 2-way set-associative data caches, and a snooping bus with MSI coherence and LR/SC atomics. Verified in simulation and synthesized for a Spartan-7 FPGA.",
    tech: ["SystemVerilog", "RISC-V", "FPGA"],
    links: [],
    image: { src: `${M}/riscv_pipeline.webp`, width: 1000, height: 610, alt: "Datapath diagram of the pipelined RISC-V processor" },
  },
  {
    title: "VACLINK™ Upgrade",
    org: "Milwaukee Tool",
    date: "2025-08",
    summary:
      "VACLINK™ lets a tool switch its dust extractor on and off wirelessly. As an intern I reworked its communication protocol, tuned the firmware for speed and reliability, and added features that made pairing and everyday use smoother.",
    tech: ["STM32", "Embedded C", "Radio", "Algorithms"],
    links: [],
    image: { src: `${M}/vaclink.webp`, width: 800, height: 530, alt: "Milwaukee Tool vacuum with the VACLINK module" },
  },
  {
    title: "AI Hardware Accelerator",
    org: "Purdue",
    date: "2025-04",
    summary:
      "An ASIC that speeds up matrix multiplication with an 8×8 systolic array. A top-level controller on an AHB bus manages the I/O buffers and sequences weight and data loads. Modular, fully synthesizable, and checked through simulation and synthesis reports.",
    tech: ["SystemVerilog", "AI"],
    links: [],
    image: { src: `${M}/337.webp`, width: 600, height: 338, alt: "Block diagram of the systolic array accelerator" },
  },
  {
    title: "Mechanical Seven-Segment Display",
    org: "es@p",
    date: "2025-04",
    summary:
      "A seven-segment display, but every segment physically flips. One servo per digit turns it through 0 to 9, which is far more fun to watch than an LED.",
    tech: ["Arduino", "ESP32"],
    links: [],
    image: { src: `${M}/mssd-poster.webp`, width: 640, height: 371, alt: "Mechanical seven-segment display counting" },
    video: `${M}/mssd.mp4`,
  },
  {
    title: "PurduDraw",
    org: "es@p",
    date: "2025-04",
    summary:
      "Upload any picture and PurduDraw turns it into one continuous line, then draws it on a real Etch A Sketch. Custom image processing plans the path; an ESP32 drives stepper motors on both knobs.",
    tech: ["ESP32", "Arduino", "Python", "Algorithms"],
    links: [],
    image: { src: `${M}/purdudraw.webp`, width: 800, height: 600, alt: "Etch A Sketch with stepper motors on its knobs" },
  },
  {
    title: "Smart Lock",
    org: "Purdue",
    date: "2024-12",
    summary:
      "A door lock you open with a 4-digit PIN or a tap of an RFID tag. The PIN is customizable and stored in EEPROM, so it survives a power cut.",
    tech: ["STM32", "Embedded C"],
    links: [{ label: "Watch the demo", href: "https://youtu.be/C6wKMHrVE4o" }],
    image: { src: `${M}/smartlock-poster.webp`, width: 600, height: 338, alt: "Smart lock prototype with keypad and RFID reader" },
    video: `${M}/smartlock.mp4`,
  },
  {
    title: "Focal Split",
    org: "Purdue",
    date: "2024-11",
    summary:
      "A handheld depth camera that computes depth from differential defocus on board. It grabs two differently focused images at once and turns them into 480×360 depth maps at 2.1 FPS over 0.4 to 1.2 m, using about 500 FLOPs per pixel and 4.9 W on a Raspberry Pi 5. Published at CVPR 2025.",
    tech: ["Python", "Computer Vision", "AI"],
    links: [
      {
        label: "CVPR 2025 paper",
        href: "https://openaccess.thecvf.com/content/CVPR2025/html/Luo_Focal_Split_Untethered_Snapshot_Depth_from_Differential_Defocus_CVPR_2025_paper.html",
      },
    ],
    image: { src: `${M}/dfdd-poster.webp`, width: 600, height: 338, alt: "Focal Split camera producing a live depth map" },
    video: `${M}/dfdd.mp4`,
  },
  {
    title: "Disease Risk Predictor",
    org: "Rogers Imaging",
    date: "2024-08",
    summary:
      "A precision-medicine tool that finds genes likely to respond to a drug, ranks disease-linked SNPs, and scores a patient's disease risk, all with unbiased statistical methods.",
    tech: ["Python", "R", "AI", "Algorithms"],
    links: [],
    image: { src: `${M}/interactome-poster.webp`, width: 600, height: 450, alt: "3D protein interaction network" },
    video: `${M}/interactome.mp4`,
  },
  {
    title: "Graph Playground",
    org: "Personal",
    date: "2024-07",
    summary:
      "A force-directed graph you can poke at. Tweak the physics live, then watch Dijkstra's algorithm find shortest paths or k-means sort the network into clusters.",
    tech: ["JavaScript", "HTML", "CSS", "Algorithms"],
    links: [
      { label: "Try it", href: `${M}/demos/graph.html` },
      { label: "GitHub", href: "https://github.com/tconcan/Network" },
    ],
    image: { src: `${M}/graph-poster.webp`, width: 486, height: 274, alt: "Force-directed graph of nodes and edges" },
    video: `${M}/graph.mp4`,
  },
  {
    title: "Particle Life",
    org: "Personal",
    date: "2024-07",
    summary:
      "Generative art from simple rules: thousands of particles pull and push on each other with randomized forces, and lifelike swirls emerge.",
    tech: ["JavaScript", "HTML", "CSS"],
    links: [
      { label: "Try it", href: `${M}/demos/life.html` },
      { label: "GitHub", href: "https://github.com/tconcan/Network" },
    ],
    image: { src: `${M}/life-poster.webp`, width: 452, height: 264, alt: "Colourful particle clusters swirling" },
    video: `${M}/life.mp4`,
  },
  {
    title: "AD Ray-Optics",
    org: "Purdue",
    date: "2024-05",
    summary:
      "A fast, stable framework for differentiable ray tracing through multi-layer optics. Its gradients beat finite differences, and lens-optimization experiments back it up.",
    tech: ["Python", "Jupyter"],
    links: [{ label: "GitHub", href: "https://github.com/guo-research-group/AD-Ray-Optics" }],
    image: { src: `${M}/ad_rayoptics.webp`, width: 788, height: 525, alt: "Rays traced through a stack of lenses" },
  },
  {
    title: "IceBreak",
    org: "Hackathon",
    date: "2024-03",
    summary:
      "A hackathon answer to college loneliness: IceBreak matches students with likely friends inside their clubs and hands them AI-generated conversation starters.",
    tech: ["Python", "Flask", "SQLite", "AI"],
    links: [{ label: "Devpost", href: "https://devpost.com/software/ice-break" }],
    image: { src: `${M}/ice_break.webp`, width: 333, height: 222, alt: "IceBreak logo" },
  },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2025-08" → "Aug 2025". */
export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};
