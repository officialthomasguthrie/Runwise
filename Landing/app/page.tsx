import { Benefits } from "./components/Benefits";
import { Contact } from "./components/Contact";
import { FAQ } from "./components/FAQ";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Posibilities } from "./components/Possibilities/Possibilities";
import { Pricing } from "./components/Pricing";
import { Process } from "./components/Process/Process";
import { WhoWeAre } from "./components/WhoWeAre";

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <WhoWeAre />
      <Process />
      <Posibilities />
      <Benefits />
      <Pricing />
      <Contact />
      <FAQ />
      <Footer />
    </main>
  );
}
