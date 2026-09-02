import { GuillocheField } from "@/components/GuillocheField";
import { Hero } from "@/components/Hero";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Landing() {
  return (
    <>
      <GuillocheField />
      <main className="landing">
        <header className="landing__top">
          <span>munerate</span>
          <span className="landing__hide-sm">The financial core for physical AI</span>
        </header>

        <Hero />

        <footer className="landing__bottom">
          <span className="landing__hide-sm">© {new Date().getFullYear()} munerate</span>
          <ThemeToggle />
          <a href="mailto:hello@munerate.com">hello@munerate.com</a>
        </footer>
      </main>
    </>
  );
}
