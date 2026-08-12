"use client";

import { domains, studyCards, type DomainId } from "@/src/lib/content";

type StudyDeckProps = {
  activeDomain: DomainId;
  completed: string[];
  onToggleCompleted: (cardId: string) => void;
};

export function StudyDeck({ activeDomain, completed, onToggleCompleted }: StudyDeckProps) {
  const cards = studyCards.filter((card) => card.domain === activeDomain);
  const domain = domains.find((item) => item.id === activeDomain)!;

  return (
    <section className="study-section" aria-labelledby="study-title">
      <div className="section-heading">
        <div>
          <p className={`eyebrow ${domain.color}`}>{domain.weight}% del examen</p>
          <h2 id="study-title">{domain.shortName}</h2>
          <p>{domain.description}</p>
        </div>
        <div className="section-count">
          {cards.filter((card) => completed.includes(card.id)).length}/{cards.length}
          <span> dominados</span>
        </div>
      </div>

      <div className="study-card-grid">
        {cards.map((card, index) => {
          const isComplete = completed.includes(card.id);
          return (
            <article className="study-card" key={card.id}>
              <div className="card-topline">
                <span className={`eyebrow ${domain.color}`}>0{index + 1} · {card.eyebrow}</span>
                {isComplete && <span className="mastered-label">✓ Dominada</span>}
              </div>
              <h3>{card.title}</h3>
              <p className="card-summary">{card.summary}</p>
              <ul className="key-points">
                {card.keyPoints.map((point) => <li key={point}>{point}</li>)}
              </ul>
              <div className="exam-tip">
                <span aria-hidden="true">✦</span>
                <p><strong>Pista de examen:</strong> {card.examTip}</p>
              </div>
              <button
                className={isComplete ? "button button-secondary" : "button button-dark"}
                onClick={() => onToggleCompleted(card.id)}
                type="button"
              >
                {isComplete ? "Marcar por repasar" : "Lo tengo claro"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
