"use client";

import { useEffect, useMemo, useState } from "react";
import { domains, questions, type DomainId, type Question } from "@/src/lib/content";

type ExamSession = {
  questions: Question[];
  answers: Record<string, number>;
  flagged: string[];
  current: number;
  timed: boolean;
  duration: number;
};

type ExamResult = {
  questions: Question[];
  answers: Record<string, number>;
  duration: number;
  expired: boolean;
};

type MockExamProps = {
  onExamComplete: (score: number) => void;
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainder = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function shuffled<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

export function MockExam({ onExamComplete }: MockExamProps) {
  const [selectedDomains, setSelectedDomains] = useState<DomainId[]>(domains.map((domain) => domain.id));
  const [questionCount, setQuestionCount] = useState(10);
  const [timed, setTimed] = useState(true);
  const [duration, setDuration] = useState(45);
  const [session, setSession] = useState<ExamSession | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);

  const availableQuestions = useMemo(
    () => questions.filter((question) => selectedDomains.includes(question.domain)),
    [selectedDomains],
  );

  useEffect(() => {
    if (!session?.timed) return;
    if (remaining <= 0) {
      const answers = session.answers;
      setResult({ questions: session.questions, answers, duration: session.duration, expired: true });
      setSession(null);
      const score = Math.round((session.questions.filter((question) => answers[question.id] === question.correctIndex).length / session.questions.length) * 100);
      onExamComplete(score);
      return;
    }
    const timer = window.setTimeout(() => setRemaining((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [onExamComplete, remaining, session]);

  function toggleDomain(id: DomainId) {
    setSelectedDomains((current) => {
      if (current.includes(id)) return current.length === 1 ? current : current.filter((item) => item !== id);
      return [...current, id];
    });
  }

  function startExam() {
    const chosen = shuffled(availableQuestions).slice(0, Math.min(questionCount, availableQuestions.length));
    setResult(null);
    setRemaining(timed ? duration * 60 : 0);
    setSession({ questions: chosen, answers: {}, flagged: [], current: 0, timed, duration });
  }

  function selectAnswer(questionId: string, answerIndex: number) {
    setSession((current) => current ? {
      ...current,
      answers: { ...current.answers, [questionId]: answerIndex },
    } : current);
  }

  function toggleFlag(questionId: string) {
    setSession((current) => {
      if (!current) return current;
      const flagged = current.flagged.includes(questionId)
        ? current.flagged.filter((id) => id !== questionId)
        : [...current.flagged, questionId];
      return { ...current, flagged };
    });
  }

  function finishExam(expired = false) {
    if (!session) return;
    const answers = session.answers;
    setResult({ questions: session.questions, answers, duration: session.duration, expired });
    setSession(null);
    const score = Math.round((session.questions.filter((question) => answers[question.id] === question.correctIndex).length / session.questions.length) * 100);
    onExamComplete(score);
  }

  if (result) {
    const correct = result.questions.filter((question) => result.answers[question.id] === question.correctIndex).length;
    const score = Math.round((correct / result.questions.length) * 100);
    return (
      <section className="exam-section results-section" aria-labelledby="exam-results-title">
        <div className="results-hero">
          <span className="results-orb">{score}%</span>
          <div>
            <p className="eyebrow teal">SIMULACRO COMPLETADO</p>
            <h2 id="exam-results-title">{correct} de {result.questions.length} respuestas correctas</h2>
            <p>{result.expired ? "El tiempo terminó y calificamos las respuestas guardadas." : "Revisa tus decisiones: la explicación es donde ocurre el aprendizaje."}</p>
          </div>
          <button className="button button-dark" onClick={() => setResult(null)} type="button">Crear otro simulacro</button>
        </div>
        <div className="result-breakdown">
          {domains.map((domain) => {
            const inDomain = result.questions.filter((question) => question.domain === domain.id);
            if (inDomain.length === 0) return null;
            const domainCorrect = inDomain.filter((question) => result.answers[question.id] === question.correctIndex).length;
            return <div className="domain-result" key={domain.id}><span>{domain.shortName}</span><strong>{domainCorrect}/{inDomain.length}</strong></div>;
          })}
        </div>
        <div className="review-answers">
          {result.questions.map((question, index) => {
            const selected = result.answers[question.id];
            const correctAnswer = selected === question.correctIndex;
            return (
              <details className={`answer-review ${correctAnswer ? "correct" : "incorrect"}`} key={question.id} open={!correctAnswer}>
                <summary><span>{correctAnswer ? "✓" : "×"}</span> {index + 1}. {question.prompt}</summary>
                <div className="answer-review-body">
                  <p><strong>Tu respuesta:</strong> {selected === undefined ? "Sin responder" : question.options[selected]}</p>
                  {!correctAnswer && <p><strong>Respuesta correcta:</strong> {question.options[question.correctIndex]}</p>}
                  <p className="explanation">{question.explanation}</p>
                </div>
              </details>
            );
          })}
        </div>
      </section>
    );
  }

  if (!session) {
    const actualCount = Math.min(questionCount, availableQuestions.length);
    return (
      <section className="exam-section setup-section" aria-labelledby="exam-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow coral">MODO EXAMEN</p>
            <h2 id="exam-title">Simulacro a tu medida</h2>
            <p>Responde sin pistas, marca dudas y recibe una revisión razonada al final.</p>
          </div>
          <span className="exam-badge">{questions.length} preguntas disponibles</span>
        </div>
        <div className="exam-setup-grid">
          <div className="setup-panel">
            <fieldset>
              <legend>1. Elige los dominios</legend>
              <div className="domain-checks">
                {domains.map((domain) => (
                  <label className={`domain-check ${selectedDomains.includes(domain.id) ? "active" : ""}`} key={domain.id}>
                    <input checked={selectedDomains.includes(domain.id)} onChange={() => toggleDomain(domain.id)} type="checkbox" />
                    <span>{domain.shortName}</span><em>{domain.weight}%</em>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>2. Número de preguntas</legend>
              <div className="segmented-control">
                {[5, 10, 15, 20].map((count) => (
                  <button className={questionCount === count ? "active" : ""} key={count} onClick={() => setQuestionCount(count)} type="button">{count}</button>
                ))}
              </div>
              <p className="setup-help">Este filtro contiene {availableQuestions.length}; comenzarás con {actualCount} preguntas.</p>
            </fieldset>
          </div>
          <div className="setup-panel timing-panel">
            <fieldset>
              <legend>3. Temporizador</legend>
              <label className="switch-row">
                <span><strong>{timed ? "Activado" : "Desactivado"}</strong><small>{timed ? "El examen se entrega al terminar el tiempo." : "Sin presión: tú decides cuándo finalizar."}</small></span>
                <input checked={timed} onChange={(event) => setTimed(event.target.checked)} type="checkbox" role="switch" />
              </label>
              {timed && <label className="duration-control">Duración <strong>{duration} min</strong><input max="120" min="10" onChange={(event) => setDuration(Number(event.target.value))} step="5" type="range" value={duration} /></label>}
            </fieldset>
            <div className="exam-ready-note"><span aria-hidden="true">⌁</span><p>Las preguntas se mezclan en cada intento y no muestran la solución hasta finalizar.</p></div>
            <button className="button button-dark start-exam" disabled={availableQuestions.length === 0} onClick={startExam} type="button">Comenzar simulacro <span aria-hidden="true">→</span></button>
          </div>
        </div>
      </section>
    );
  }

  const currentQuestion = session.questions[session.current];
  const answered = Object.keys(session.answers).length;
  const isFlagged = session.flagged.includes(currentQuestion.id);
  return (
    <section className="exam-section live-exam" aria-labelledby="live-exam-title">
      <header className="live-exam-header">
        <div><p className="eyebrow coral">SIMULACRO EN CURSO</p><h2 id="live-exam-title">Pregunta {session.current + 1} de {session.questions.length}</h2></div>
        <div className="exam-status">
          <span>{answered}/{session.questions.length} respondidas</span>
          {session.timed ? <strong className={remaining < 300 ? "timer warning" : "timer"}>◷ {formatTime(remaining)}</strong> : <strong className="timer no-timer">Sin tiempo</strong>}
        </div>
      </header>
      <div className="exam-progress" aria-label={`${answered} preguntas respondidas`}><span style={{ width: `${(answered / session.questions.length) * 100}%` }} /></div>
      <div className="exam-workspace">
        <nav className="question-nav" aria-label="Navegación de preguntas">
          <p>Preguntas</p>
          <div>{session.questions.map((question, index) => <button aria-label={`Ir a pregunta ${index + 1}`} className={`${session.current === index ? "current" : ""} ${session.answers[question.id] !== undefined ? "answered" : ""} ${session.flagged.includes(question.id) ? "flagged" : ""}`} key={question.id} onClick={() => setSession((current) => current ? { ...current, current: index } : current)} type="button">{index + 1}</button>)}</div>
          <small>● respondida &nbsp; ⚑ marcada</small>
        </nav>
        <article className="question-card">
          <div className="question-meta"><span>{domains.find((domain) => domain.id === currentQuestion.domain)?.shortName}</span><span>{currentQuestion.scenario}</span></div>
          <h3>{currentQuestion.prompt}</h3>
          <div className="answer-options">
            {currentQuestion.options.map((option, index) => (
              <button className={session.answers[currentQuestion.id] === index ? "selected" : ""} key={option} onClick={() => selectAnswer(currentQuestion.id, index)} type="button"><span>{String.fromCharCode(65 + index)}</span>{option}</button>
            ))}
          </div>
          <div className="question-actions">
            <button className={isFlagged ? "text-button is-flagged" : "text-button"} onClick={() => toggleFlag(currentQuestion.id)} type="button">⚑ {isFlagged ? "Marcada para revisar" : "Marcar para revisar"}</button>
            <div>
              <button className="button button-secondary" disabled={session.current === 0} onClick={() => setSession((current) => current ? { ...current, current: current.current - 1 } : current)} type="button">Anterior</button>
              {session.current < session.questions.length - 1 ? <button className="button button-dark" onClick={() => setSession((current) => current ? { ...current, current: current.current + 1 } : current)} type="button">Siguiente</button> : <button className="button button-dark" onClick={() => finishExam(false)} type="button">Finalizar y calificar</button>}
            </div>
          </div>
        </article>
      </div>
      <button className="finish-link" onClick={() => finishExam(false)} type="button">Finalizar simulacro ahora</button>
    </section>
  );
}
