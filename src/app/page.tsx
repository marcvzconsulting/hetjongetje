import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center">
      <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-8 text-6xl">📖✨</div>
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          Ons <span className="text-primary">Verhaaltje</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Magische, gepersonaliseerde verhalen voor jouw kind. Met prachtige
          illustraties en avonturen die écht over hen gaan.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-primary px-8 py-3 text-lg font-semibold text-white transition-colors hover:bg-primary-light"
          >
            Begin het avontuur
          </Link>
          <Link
            href="/login"
            className="rounded-full border-2 border-primary px-8 py-3 text-lg font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
          >
            Inloggen
          </Link>
        </div>
        <div className="mt-16 grid max-w-3xl grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted p-6">
            <div className="text-3xl">🧒</div>
            <h3 className="font-bold">Persoonlijk</h3>
            <p className="text-sm text-muted-foreground">
              Verhalen op maat, gebaseerd op het leven van jouw kind
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted p-6">
            <div className="text-3xl">🎨</div>
            <h3 className="font-bold">Geïllustreerd</h3>
            <p className="text-sm text-muted-foreground">
              Prachtige AI-illustraties bij elk verhaal
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-muted p-6">
            <div className="text-3xl">📚</div>
            <h3 className="font-bold">Jouw Boek</h3>
            <p className="text-sm text-muted-foreground">
              Bundel verhalen tot een echt gedrukt kinderboek
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
