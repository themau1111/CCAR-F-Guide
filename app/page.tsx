"use client";

import { useCallback, useEffect, useState } from "react";
import { MockExam } from "@/src/components/MockExam";
import { ReviewArena } from "@/src/components/ReviewArena";
import { StudyDeck } from "@/src/components/StudyDeck";
import { CoverageMap } from "@/src/components/CoverageMap";
import { domains, sourceRepository, studyCards, type DomainId } from "@/src/lib/content";

type Tab = "learn" | "exam";

type Progress = {
  completed: string[];
  mastered: string[];
  examCount: number;
  bestScore: number | null;
  lastScore: number | null;
};

const storageKey = "claude-architect-study-lab-progress";
const emptyProgress: Progress = { completed: [], mastered: [], examCount: 0, bestScore: null, lastScore: null };

function toggleItem(items: string[], item: string) {
  return items.includes(item) ? items.filter((value) => value !== item) : [...items, item];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("learn");
  const [activeDomain, setActiveDomain] = useState<DomainId>("agents");
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) setProgress({ ...emptyProgress, ...JSON.parse(stored) });
    } catch {
      // Browsing without storage still leaves the entire study experience usable.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) window.localStorage.setItem(storageKey, JSON.stringify(progress));
  }, [progress, ready]);

  const completion = Math.round((progress.completed.length / studyCards.length) * 100);
  const toggleCompleted = useCallback((cardId: string) => {
    setProgress((current) => ({ ...current, completed: toggleItem(current.completed, cardId) }));
  }, []);

  const toggleMastered = useCallback((cardId: string) => {
    setProgress((current) => ({ ...current, mastered: toggleItem(current.mastered, cardId) }));
  }, []);

  const recordExam = useCallback((score: number) => {
    setProgress((current) => ({
      ...current,
      examCount: current.examCount + 1,
      lastScore: score,
      bestScore: current.bestScore === null ? score : Math.max(current.bestScore, score),
    }));
  }, []);

  return (
    <main className="site-shell" id="top">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Inicio de Claude Architect Study Lab">
          <span className="brand-mark">C</span>
          <span>Architect<br /><strong>Study Lab</strong></span>
        </a>
        <nav className="top-nav" aria-label="Secciones principales">
          <button className={activeTab === "learn" ? "active" : ""} onClick={() => setActiveTab("learn")} type="button">Dominios</button>
          <button className={activeTab === "exam" ? "active" : ""} onClick={() => setActiveTab("exam")} type="button">Simulacros</button>
        </nav>
        <button className="header-action" onClick={() => setActiveTab("exam")} type="button">Ir al simulacro <span aria-hidden="true">↗</span></button>
      </header>

      <div className="workspace">
        <aside className="domain-sidebar">
          <div className="sidebar-heading"><p className="eyebrow">RUTA DE ESTUDIO</p><h2>Dominios de examen</h2></div>
          <div className="domain-list">
            {domains.map((domain, index) => {
              const cardsInDomain = studyCards.filter((card) => card.domain === domain.id);
              const completeInDomain = cardsInDomain.filter((card) => progress.completed.includes(card.id)).length;
              return (
                <button className={`domain-link ${activeDomain === domain.id ? "active" : ""}`} key={domain.id} onClick={() => { setActiveDomain(domain.id); setActiveTab("learn"); }} type="button">
                  <span className="domain-number">0{index + 1}</span>
                  <span className="domain-name"><strong>{domain.shortName}</strong><small>{domain.weight}% del examen</small></span>
                  <span className="mini-progress"><i style={{ width: `${(completeInDomain / cardsInDomain.length) * 100}%` }} /></span>
                </button>
              );
            })}
          </div>
          <div className="sidebar-progress" aria-label="Tu progreso"><div><span>Progreso</span><strong>{ready ? `${completion}%` : "…"}</strong></div><div className="progress-track"><span style={{ width: `${completion}%` }} /></div><p>{progress.completed.length}/{studyCards.length} conceptos trabajados</p></div>
          <CoverageMap compact />
          <div className="sidebar-card"><span aria-hidden="true">⌁</span><p><strong>Prioridad:</strong> Agentes representa el 27% del examen.</p></div>
        </aside>

        <div className="content-area">
          {activeTab === "learn" && <><StudyDeck activeDomain={activeDomain} completed={progress.completed} onToggleCompleted={toggleCompleted} /><ReviewArena activeDomain={activeDomain} mastered={progress.mastered} onToggleMastered={toggleMastered} /></>}
          {activeTab === "exam" && <MockExam onExamComplete={recordExam} />}
        </div>
      </div>

      <section className="bottom-cta">
        <div><p className="eyebrow teal">RITMO SOSTENIBLE</p><h2>¿Listo para ponerlo a prueba?</h2><p>Completa una sesión, repasa lo que fallaste y vuelve con un simulacro diferente.</p></div>
        <div className="cta-stats"><span><strong>{progress.mastered.length}</strong> flashcards dominadas</span><span><strong>{progress.examCount}</strong> simulacros completados</span></div>
        <button className="button button-dark" onClick={() => setActiveTab("exam")} type="button">Crear simulacro <span aria-hidden="true">→</span></button>
      </section>

      <footer className="site-footer">
        <p>Herramienta de estudio independiente basada en materiales públicos de la comunidad. No es un producto oficial de Anthropic ni garantiza una certificación.</p>
        <a href={sourceRepository} rel="noreferrer" target="_blank">Ver materiales de referencia ↗</a>
      </footer>
    </main>
  );
}
