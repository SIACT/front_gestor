import { Link } from 'react-router-dom';
import { ArrowLeft, Code2, Users, GraduationCap, Mail } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Logo } from '../components/ui/Logo';

// lucide-react (v1.26 instalada en este proyecto) ya no incluye íconos de marca (Github,
// Linkedin, etc.) — mismo patrón que MailIcon/LockIcon en Login.jsx para los que faltan.
function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.221-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.269 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.295 2.747-1.026 2.747-1.026.546 1.378.202 2.397.1 2.65.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .268.18.58.688.482A10.02 10.02 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function LinkedinIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zM8.339 18.337V9.734H5.667v8.603h2.672zM7.005 8.574a1.548 1.548 0 100-3.096 1.548 1.548 0 000 3.096zm11.335 9.763v-4.797c0-2.568-1.371-3.763-3.199-3.763-1.474 0-2.135.812-2.502 1.382v-1.185h-2.671c.035.75 0 8.363 0 8.363h2.671v-4.673c0-.25.018-.5.093-.68.204-.5.668-1.02 1.447-1.02 1.02 0 1.427.777 1.427 1.917v4.456h2.734z" />
    </svg>
  );
}

const BIO_CHRISTIAN =
  'Estudiante de Ingeniería de Sistemas en la Universidad de Nariño. Diseñó y construyó, ' +
  'iteración a iteración, la plataforma completa de gestión de congresos que sostiene a ALTENCOA: ' +
  'desde el primer formulario de inscripción hasta un sistema multi-congreso con roles por evento, ' +
  'calendarios de horarios con detección de solapamientos, certificación, gestión de ponencias e ' +
  'inscripción y una agenda pública que se adapta en tiempo real a lo que el comité programa, el ' +
  'ciclo de vida de un congreso.';

// Página standalone (no usa AuthLayout: layout de una sola columna, sin panel dividido) y pública
// (fuera del árbol de ProtectedRoute en App.jsx) — accesible sin sesión iniciada.
export function Creditos() {
  return (
    <main className="min-h-screen w-full bg-background">
      <div className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-4">
            <Link
              to="/login"
              className="inline-flex w-fit items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted transition-colors hover:text-text-primary"
            >
              <ArrowLeft className="size-3.5" />
              Volver al inicio
            </Link>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-accent">
                Equipo del proyecto
              </span>
              <h1 className="font-display text-4xl text-text-primary">Equipo de Desarrollo</h1>
              <p className="font-sans text-sm text-text-muted">
                <span className="font-semibold text-text-primary">Altenua Systems</span> · talksGestor
                — Plataforma de gestión de Congresos
              </p>
            </div>
          </div>

          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-accent bg-accent/10 p-2">
            <Logo variant="altenua" className="h-full w-full object-contain" />
          </div>
        </div>

        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Code2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-accent">Desarrollador</p>
              <h2 className="font-display text-xl text-text-primary">Autor del sistema</h2>
            </div>
          </div>

          <Card className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <img
              src="https://avatars.githubusercontent.com/u/177427924?s=400&u=5ca377816ae610df6cf2cea969a16a7a411ef48b&v=4"
              alt="Christian Yamith Salazar Botina"
              className="size-36 shrink-0 align-center justify-center mt-6 self-center rounded-full object-cover sm:self-start"
              loading="lazy"
            />
            <div className="flex flex-col gap-2">
              <div>
                <p className="text-lg font-bold text-text-primary">Christian Yamith Salazar Botina</p>
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  Desarrollador Full-Stack
                </p>
              </div>
              <p className="text-sm text-text-muted">{BIO_CHRISTIAN}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted">
                  <GraduationCap className="size-3.5" />
                  Universidad de Nariño
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted">
                  <Mail className="size-3.5" />
                  cristianyamith@hotmail.com
                </span>
                <a
                  href="https://github.com/ChristianSalazar12"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  <GithubIcon className="size-3.5" />
                  GitHub
                </a>
                <a
                  href="https://www.linkedin.com/in/christian-salazar-3aa242335"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
                >
                  <LinkedinIcon className="size-3.5" />
                  LinkedIn
                </a>
              </div>
            </div>
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Users className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-accent">
                Asesores &amp; Coordinadores
              </p>
              <h2 className="font-display text-xl text-text-primary">
                Coordinación del Congreso ALTENCOA
              </h2>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="flex overflow-hidden p-0!">
              <img
                src="https://www.udenar.edu.co/recursos/wp-content/uploads/2022/06/catalina_rua.jpg"
                alt="Catalina Rúa"
                className="w-1/3 max-w-48 shrink-0 object-contain"
                loading="lazy"
              />
              <div className="flex min-w-0 flex-col gap-1 p-4">
                <p className="font-bold text-text-primary">Catalina Rúa</p>
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  Asesora · Coordinadora del Congreso
                </p>
                <p className="text-xs text-text-muted">Congreso ALTENCOA · Universidad de Nariño</p>
                <p className="mt-2 text-sm text-text-muted">
                  Matemática de la Universidad de Antioquia, Magíster en Computación Científica de
                  la Universidad de Puerto Rico Recinto de Mayagüez, Doctora en Matemática Aplicada
                  de la Universidad de São Paulo. Fundadora y Coordinadora de la Olimpiada Regional
                  de Matemáticas de la Universidad de Nariño (ORM-UDENAR).
                </p>
              </div>
            </Card>

            <Card className="flex overflow-hidden p-0!">
              <img
                src="https://www.udenar.edu.co/recursos/wp-content/uploads/2021/08/JOHN-HERMES-CASTILLO-GOMEZ.jpg"
                alt="John Hermes"
                className="w-1/3 max-w-48 shrink-0 object-contain"
                loading="lazy"
              />
              <div className="flex min-w-0 flex-col gap-1 p-4">
                <p className="font-bold text-text-primary">John Hermes</p>
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  Asesor · Coordinador del Congreso
                </p>
                <p className="text-xs text-text-muted">Congreso ALTENCOA · Universidad de Nariño</p>
                <p className="mt-2 text-sm text-text-muted">
                  Matemático de la Universidad del Cauca, Magíster en Matemáticas de la Universidad
                  de Antioquia y Doutorado em Matemáticas de Universidade de São Paulo – USP.
                </p>
              </div>
            </Card>
          </div>

          <div className="rounded-lg border border-accent/30 bg-accent/10 p-4 text-sm text-text-muted">
            Definieron los objetivos y necesidades del sistema, y son quienes coordinan el uso de la
            plataforma en el congreso ALTENCOA.
          </div>
        </section>
      </div>
    </main>
  );
}
