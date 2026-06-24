import { Header } from "@/components/header";
import { createFileRoute, Link } from "@tanstack/react-router";
import IconV1 from "@/assets/variant-1.svg?react";
import { Button } from "@/components/ui/button";
import { DoubleHelix } from "@/components/icons/double-helix";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="[view-transition-name:main-content] dot-grid flex flex-col items-center">
      <Header
        className={
          "px-4 py-4 border border-b justify-between bg-white shadow-lg"
        }
      >
        <div className="text-white size-10">
          <Link to="/">
            <IconV1 className="w-full h-full" />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link
              to="/login"
              viewTransition={{
                types: ["slide-left"],
              }}
              preload={false}
            >
              Login
            </Link>
          </Button>
          <Button asChild>
            <Link
              to="/signup"
              viewTransition={{
                types: ["slide-left"],
              }}
              preload={false}
            >
              Signup
            </Link>
          </Button>
        </div>
      </Header>
      <section className="h-screen w-screen grid lg:flex p-4">
        {/* Left side content */}
        <article className="z-10 flex flex-col gap-6 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-500 text-blue-600 text-sm font-medium w-fit">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            v1.0 is now live
          </div>
          <h1 className="text-6xl lg:text-8xl font-black tracking-tight text-slate-900 leading-[0.9]">
            Your last{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
              note taking
            </span>{" "}
            app.
          </h1>
          <p className="text-xl text-slate-500 max-w-md leading-relaxed">
            Capture thoughts at the speed of light. A minimalist workspace
            designed for clarity and focus.
          </p>

          <div className="flex gap-4 mt-4">
            <Button className="h-12 px-8 rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-blue-100">
              Get Started Free
            </Button>
            <Button variant="outline" className="h-12 px-8 rounded-xl">
              View Demo
            </Button>
          </div>
        </article>
        {/* Right side content */}
        <article className="flex flex-1 h-4/5">
          <DoubleHelix />
        </article>
      </section>
      <footer>footer</footer>
    </div>
  );
}
