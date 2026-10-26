import { useEffect, useRef, useState } from 'react';
import './index.css';
import './styles/shell.css';
import './styles/base.css';
import './styles/hero.css';
import './styles/sections.css';
import './styles/getstarted.css';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import GetStartedPage from './pages/GetStartedPage';
import IntroLoader from './components/IntroLoader';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/*
  The landing site is one app with two "pages" chosen by the URL hash:
    (anything else) -> the home page, #section hashes scroll to that section
    #get-started    -> the role picker

  The navbar and footer stay mounted while the page between them changes, so
  switching pages never makes the header flicker, and the content cross-fades
  in (.page-swap in styles/shell.css) instead of snapping.
*/
function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  const isGetStarted = hash === '#get-started';
  const firstRun = useRef(true);
  const lastPage = useRef(isGetStarted);
  const main = useRef(null);

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.title = isGetStarted ? 'Get Started · CivicConnect' : 'CivicConnect';
  }, [isGetStarted]);

  useEffect(() => {
    // Arriving from another page (or first load): jump straight to the spot.
    // Moving around the page you are already on: scroll smoothly.
    const swapped = lastPage.current !== isGetStarted;
    const instant = firstRun.current || swapped || reducedMotion();
    lastPage.current = isGetStarted;
    firstRun.current = false;
    const behavior = instant ? 'instant' : 'smooth';

    if (swapped) main.current?.focus({ preventScroll: true });

    if (isGetStarted) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      return undefined;
    }

    const id = hash.replace('#', '');
    // Wait a moment so the page that just mounted has laid out before measuring it.
    const timer = setTimeout(() => {
      const el = id && id !== 'home' ? document.getElementById(id) : null;
      if (el) el.scrollIntoView({ behavior, block: 'start' });
      else window.scrollTo({ top: 0, behavior });
    }, 60);

    return () => clearTimeout(timer);
  }, [hash, isGetStarted]);

  return (
    <>
      <IntroLoader />
      <Navbar page={isGetStarted ? 'get-started' : 'home'} />
      <main key={isGetStarted ? 'get-started' : 'home'} ref={main} className="page-swap" tabIndex={-1}>
        {isGetStarted ? <GetStartedPage /> : <LandingPage />}
      </main>
      <Footer />
    </>
  );
}

export default App;
