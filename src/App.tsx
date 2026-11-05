import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Cheatsheet } from './sections/Cheatsheet';
import { Concepts } from './sections/Concepts';
import { Playground } from './sections/Playground';

export function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Concepts />
        <Playground />
        <Cheatsheet />
      </main>
      <Footer />
    </>
  );
}
