"use client";

import { useMemo, useState } from "react";
import { agentLoopSteps, domains, flashcards, matchPairs, type DomainId } from "@/src/lib/content";

type ReviewArenaProps = {
  activeDomain: DomainId;
  mastered: string[];
  onToggleMastered: (cardId: string) => void;
};

export function ReviewArena({ activeDomain, mastered, onToggleMastered }: ReviewArenaProps) {
  const domainFlashcards = useMemo(
    () => flashcards.filter((card) => card.domain === activeDomain),
    [activeDomain],
  );
  const [flashIndex, setFlashIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [mistake, setMistake] = useState<string | null>(null);
  const [steps, setSteps] = useState([
    agentLoopSteps[2],
    agentLoopSteps[0],
    agentLoopSteps[4],
    agentLoopSteps[1],
    agentLoopSteps[3],
  ]);
  const [orderChecked, setOrderChecked] = useState(false);

  const currentCard = domainFlashcards[flashIndex % domainFlashcards.length];
  const activeDomainName = domains.find((domain) => domain.id === activeDomain)?.shortName;
  const isCurrentMastered = mastered.includes(currentCard.id);
  const allMatched = matched.length === matchPairs.length;
  const orderCorrect = steps.every((step, index) => step === agentLoopSteps[index]);

  function advanceCard() {
    setFlashIndex((index) => (index + 1) % domainFlashcards.length);
    setShowAnswer(false);
  }

  function chooseRight(pairLeft: string) {
    if (!selectedLeft || matched.includes(pairLeft)) return;
    if (selectedLeft === pairLeft) {
      setMatched((items) => [...items, pairLeft]);
      setMistake(null);
    } else {
      setMistake(pairLeft);
      window.setTimeout(() => setMistake(null), 500);
    }
    setSelectedLeft(null);
  }

  function moveStep(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= steps.length) return;
    const next = [...steps];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setSteps(next);
    setOrderChecked(false);
  }

  return (
    <section className="review-section" aria-labelledby="review-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow teal">REPASO ACTIVO</p>
          <h2 id="review-title">Aprende haciendo</h2>
          <p>Recuperar la respuesta de memoria fortalece más que volver a leerla.</p>
        </div>
        <span className="domain-pill">{activeDomainName}</span>
      </div>

      <div className="review-grid">
        <article className="game-card flashcard-game">
          <div className="game-heading">
            <span className="game-icon" aria-hidden="true">▣</span>
            <div><h3>Flashcard express</h3><p>{flashIndex + 1} de {domainFlashcards.length}</p></div>
          </div>
          <button
            className={`flashcard ${showAnswer ? "is-flipped" : ""}`}
            onClick={() => setShowAnswer((value) => !value)}
            type="button"
            aria-label="Mostrar u ocultar respuesta"
          >
            <span className="flashcard-side flashcard-front">
              <small>PREGUNTA</small>
              <strong>{currentCard.front}</strong>
              <em>Haz clic para revelar</em>
            </span>
            <span className="flashcard-side flashcard-back">
              <small>RESPUESTA</small>
              <strong>{currentCard.back}</strong>
              <em>Haz clic para volver</em>
            </span>
          </button>
          <div className="game-actions">
            <button className="text-button" onClick={advanceCard} type="button">La repasaré</button>
            <button className={isCurrentMastered ? "button button-secondary" : "button button-dark"} onClick={() => onToggleMastered(currentCard.id)} type="button">
              {isCurrentMastered ? "Marcada como dominada" : "La dominé"}
            </button>
          </div>
        </article>

        <article className="game-card matcher-game">
          <div className="game-heading">
            <span className="game-icon coral" aria-hidden="true">↔</span>
            <div><h3>Empareja el concepto</h3><p>Elige un término y luego su definición.</p></div>
          </div>
          <div className="match-board">
            <div className="match-column">
              {matchPairs.map((pair) => (
                <button
                  className={`match-button ${selectedLeft === pair.left ? "selected" : ""} ${matched.includes(pair.left) ? "matched" : ""}`}
                  disabled={matched.includes(pair.left)}
                  key={pair.left}
                  onClick={() => setSelectedLeft(pair.left)}
                  type="button"
                >
                  {matched.includes(pair.left) ? "✓ " : ""}{pair.left}
                </button>
              ))}
            </div>
            <div className="match-column match-right">
              {[matchPairs[2], matchPairs[0], matchPairs[4], matchPairs[1], matchPairs[3]].map((pair) => (
                <button
                  className={`match-button ${matched.includes(pair.left) ? "matched" : ""} ${mistake === pair.left ? "mistake" : ""}`}
                  disabled={matched.includes(pair.left) || !selectedLeft}
                  key={pair.right}
                  onClick={() => chooseRight(pair.left)}
                  type="button"
                >
                  {pair.right}
                </button>
              ))}
            </div>
          </div>
          {allMatched ? (
            <div className="success-note">¡Perfecto! Conectaste los cinco conceptos.</div>
          ) : (
            <button className="text-button reset-game" onClick={() => { setMatched([]); setSelectedLeft(null); }} type="button">Reiniciar juego</button>
          )}
        </article>

        <article className="game-card order-game">
          <div className="game-heading">
            <span className="game-icon yellow" aria-hidden="true">↕</span>
            <div><h3>Ordena el ciclo del agente</h3><p>Mueve cada paso hasta dejar un flujo válido.</p></div>
          </div>
          <ol className="step-list">
            {steps.map((step, index) => (
              <li key={step}>
                <span className="step-number">{index + 1}</span>
                <span>{step}</span>
                <span className="move-controls">
                  <button aria-label={`Subir paso ${index + 1}`} onClick={() => moveStep(index, -1)} type="button">↑</button>
                  <button aria-label={`Bajar paso ${index + 1}`} onClick={() => moveStep(index, 1)} type="button">↓</button>
                </span>
              </li>
            ))}
          </ol>
          <div className="order-footer">
            {orderChecked && <span className={orderCorrect ? "success-inline" : "error-inline"}>{orderCorrect ? "✓ Orden correcto" : "Aún no: revisa la señal y el resultado."}</span>}
            <button className="button button-dark" onClick={() => setOrderChecked(true)} type="button">Comprobar orden</button>
          </div>
        </article>
      </div>
    </section>
  );
}
