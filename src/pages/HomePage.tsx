import About from "../components/home/About";
import Experience from "../components/home/experience/Experience";
import Hero from "../components/home/Hero";
import Involvement from "../components/home/involvement/Involvement";

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Involvement />
      <Experience />
    </>
  );
}
