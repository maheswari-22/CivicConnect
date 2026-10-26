import Hero from '../components/Hero';
import Marquee from '../components/Marquee';
import Problem from '../components/Problem';
import Flow from '../components/Flow';
import PhotoDemo from '../components/PhotoDemo';
import Roles from '../components/Roles';
import FeatureGrid from '../components/FeatureGrid';
import HowItWorks from '../components/HowItWorks';
import Stats from '../components/Stats';
import About from '../components/About';
import Closing from '../components/Closing';
import { useScrollReveal } from '../hooks/useScrollReveal';

function LandingPage() {
  useScrollReveal();

  return (
    <>
      <Hero />
      <Marquee />
      <Problem />
      <Flow />
      <PhotoDemo />
      <Roles />
      <FeatureGrid />
      <HowItWorks />
      <Stats />
      <About />
      <Closing />
    </>
  );
}

export default LandingPage;
