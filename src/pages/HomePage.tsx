import About from "../components/home/About";
import Experience from "../components/home/experience/Experience";
import Hero from "../components/home/Hero";
import Involvement from "../components/home/involvement/Involvement";
import MoreLinks from "../components/home/MoreLinks";

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Involvement />
      <Experience />
      <MoreLinks />
    </>
  );
}
