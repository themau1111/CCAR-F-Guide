"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  domains,
  flashcards,
  gameFormats,
  matchPairsByDomain,
  orderingChallenges,
  questions,
  recommendedGames,
  studyCards,
  type DomainId,
  type GameId,
  type Question,
} from "@/src/lib/content";

type ReviewArenaProps = {
  activeDomain: DomainId;
  mastered: string[];
  onToggleMastered: (cardId: string) => void;
};

type Statement = { text: string; truth: boolean; explanation: string };
type Challenge = { prompt: string; options: string[]; answer: string; explanation: string };
type SortItem = { text: string; category: "Patrón" | "Antipatrón"; explanation: string };

const trueFalseStatements: Record<DomainId, Statement[]> = {
  agents: [
    { text: "Un subagente hereda automáticamente el historial completo del coordinador.", truth: false, explanation: "Los subagentes tienen contexto aislado; el coordinador debe pasar explícitamente el material necesario." },
    { text: "Un hook es preferible a un prompt cuando una regla de negocio debe cumplirse de forma determinista.", truth: true, explanation: "Los hooks interceptan el flujo de forma programática; un prompt solo guía probabilísticamente." },
  ],
  tools: [
    { text: "Un Resource MCP aporta contexto sin representar una acción operativa.", truth: true, explanation: "Los resources exponen documentación, catálogos o esquemas; las tools realizan acciones." },
    { text: "Dar las mismas 18 tools a todos los agentes mejora la selección de herramientas.", truth: false, explanation: "Los conjuntos grandes e irrelevantes reducen fiabilidad; cada rol debe tener capacidades mínimas." },
  ],
  code: [
    { text: "Las reglas .claude/rules pueden cargarse solo para archivos que coinciden con paths.", truth: true, explanation: "El frontmatter paths permite aplicar convenciones sin contaminar el contexto de archivos irrelevantes." },
    { text: "Un CLAUDE.md dentro de ~/.claude se comparte automáticamente con los compañeros del repositorio.", truth: false, explanation: "La configuración de usuario es personal; las reglas compartidas deben estar versionadas en el proyecto." },
  ],
  prompts: [
    { text: "Un JSON Schema válido garantiza que los valores extraídos sean semánticamente correctos.", truth: false, explanation: "El esquema garantiza forma y tipos; los cálculos, hechos y relaciones requieren validación adicional." },
    { text: "Los ejemplos few-shot tienen más valor en fronteras ambiguas que en casos obvios repetidos.", truth: true, explanation: "Los casos límite enseñan la decisión comparativa que el modelo debe aprender." },
  ],
  context: [
    { text: "Un resumen narrativo es suficiente para preservar con exactitud todos los IDs, importes y fechas de una conversación larga.", truth: false, explanation: "Los datos exactos se degradan al resumir; deben mantenerse en un bloque estructurado de hechos." },
    { text: "Una síntesis puede ser útil aunque haya fuentes fallidas si declara explícitamente la cobertura parcial.", truth: true, explanation: "La transparencia mantiene el valor de resultados válidos sin ocultar la incertidumbre." },
  ],
};

const blankChallenges: Record<DomainId, Challenge> = {
  agents: { prompt: "El ciclo solo debe presentar una respuesta final cuando stop_reason sea ___.", options: ["tool_use", "end_turn", "max_tokens", "validation_error"], answer: "end_turn", explanation: "end_turn es la señal estructurada de finalización." },
  tools: { prompt: "Para obligar a que el modelo llame alguna tool disponible se usa tool_choice: ___.", options: ["auto", "any", "never", "resource"], answer: "any", explanation: "any exige al menos una llamada a herramienta, sin fijar cuál." },
  code: { prompt: "Una skill que necesita aislar su salida verbosa usa en su frontmatter context: ___.", options: ["fork", "resume", "compact", "glob"], answer: "fork", explanation: "context: fork ejecuta la skill en un subagente aislado." },
  prompts: { prompt: "Si un dato puede no aparecer en el documento, el campo del esquema debería ser ___.", options: ["required siempre", "nullable u opcional", "un número inventado", "una string vacía"], answer: "nullable u opcional", explanation: "Así la salida reconoce la ausencia de evidencia sin fabricar un valor." },
  context: { prompt: "Los importes, IDs y fechas deben conservarse en un ___.", options: ["bloque estructurado de hechos", "saludo del sistema", "título de la tool", "resumen vago"], answer: "bloque estructurado de hechos", explanation: "El bloque persiste detalles verificables que no deben perderse al compactar." },
};

const sortItems: Record<DomainId, SortItem[]> = {
  agents: [
    { text: "Bloquear un reembolso hasta validar identidad y pedido.", category: "Patrón", explanation: "Es una precondición determinista para una operación sensible." },
    { text: "Concluir que el agente terminó porque escribió ‘listo’.", category: "Antipatrón", explanation: "La finalización se determina con stop_reason, no con frases del modelo." },
  ],
  tools: [
    { text: "Reemplazar fetch_url por load_document en un agente documental.", category: "Patrón", explanation: "Una interfaz restringida reduce usos fuera de rol." },
    { text: "Devolver ‘Operation failed’ sin categoría ni contexto.", category: "Antipatrón", explanation: "El coordinador no puede decidir si reintentar, cambiar la consulta o escalar." },
  ],
  code: [
    { text: "Versionar convenciones compartidas junto al proyecto.", category: "Patrón", explanation: "Todo el equipo recibe instrucciones al clonar el repositorio." },
    { text: "Usar ejecución directa para una migración grande y ambigua.", category: "Antipatrón", explanation: "Los cambios amplios o desconocidos requieren exploración y plan antes de editar." },
  ],
  prompts: [
    { text: "Pedir evidencia y categorías explícitas en una revisión automática.", category: "Patrón", explanation: "Criterios específicos reducen falsos positivos y hacen revisable la salida." },
    { text: "Confiar en JSON válido para aprobar un cálculo financiero.", category: "Antipatrón", explanation: "La estructura no verifica la semántica ni las reglas de negocio." },
  ],
  context: [
    { text: "Anotar qué conclusiones tienen cobertura parcial.", category: "Patrón", explanation: "La incertidumbre visible permite decidir con responsabilidad." },
    { text: "Escoger una de dos fuentes contradictorias sin guardar atribución.", category: "Antipatrón", explanation: "Se pierde provenance y la posibilidad de reconciliar el conflicto." },
  ],
};

const antiPatterns: Record<DomainId, Challenge> = {
  agents: { prompt: "El coordinador lanza todos los subagentes posibles para cada tarea, incluso cuando no son relevantes. ¿Cuál es el problema principal?", options: ["Selección estática y sobre-delegación", "Falta de color en las tarjetas", "Uso correcto de paralelismo", "Exceso de custom_id"], answer: "Selección estática y sobre-delegación", explanation: "El coordinador debe seleccionar subagentes dinámicamente según la tarea, no ejecutar siempre el mismo pipeline." },
  tools: { prompt: "Dos tools se llaman analyze_content y analyze_document, tienen descripciones casi idénticas y se eligen mal. ¿Qué antipatrón observas?", options: ["Contratos semánticamente solapados", "Un error de CSS", "Un Resource bien definido", "Un handoff completo"], answer: "Contratos semánticamente solapados", explanation: "Nombres y descripciones superpuestos impiden que el modelo distinga cuándo usar cada herramienta." },
  code: { prompt: "Una regla de pruebas para archivos dispersos se colocó en un CLAUDE.md de un único subdirectorio. ¿Qué problema causa?", options: ["Alcance incorrecto de la convención", "Demasiados ejemplos few-shot", "Uso correcto de paths", "Timeout de Batch API"], answer: "Alcance incorrecto de la convención", explanation: "Para patrones repartidos conviene .claude/rules con paths, no una regla local a un directorio." },
  prompts: { prompt: "El prompt de revisión dice solo ‘sé más conservador’ y sigue generando alertas irrelevantes. ¿Qué falta?", options: ["Criterios concretos de qué reportar y qué excluir", "Más saludos", "Una tool de escritura", "Un contexto más largo sin estructura"], answer: "Criterios concretos de qué reportar y qué excluir", explanation: "Las instrucciones vagas no sustituyen umbrales, categorías y evidencia específica." },
  context: { prompt: "Tras un timeout de dos fuentes, el informe final afirma cobertura completa. ¿Cuál es el antipatrón?", options: ["Ocultar la cobertura parcial", "Handoff estructurado", "Recorte de contexto", "Confianza por campo"], answer: "Ocultar la cobertura parcial", explanation: "Debe conservarse el resultado útil, pero declarando explícitamente los huecos y su impacto." },
};

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function GameHeader({ gameId, domainName }: { gameId: GameId; domainName: string }) {
  const game = gameFormats.find((format) => format.id === gameId)!;
  return <div className="game-heading"><span className={`game-icon game-${gameId}`} aria-hidden="true">{game.icon}</span><div><h3>{game.label}</h3><p>{game.description} · {domainName}</p></div></div>;
}

export function ReviewArena({ activeDomain, mastered, onToggleMastered }: ReviewArenaProps) {
  const domainName = domains.find((domain) => domain.id === activeDomain)?.shortName ?? "";
  const recommended = recommendedGames[activeDomain];
  const [activeGame, setActiveGame] = useState<GameId>(recommended[0]);

  useEffect(() => setActiveGame(recommended[0]), [recommended]);

  return (
    <section className="review-section" aria-labelledby="practice-title">
      <div className="section-heading practice-heading">
        <div><p className="eyebrow magenta">PRÁCTICA INTEGRADA</p><h2 id="practice-title">Aprende, recuerda y decide</h2><p>Después de las tarjetas de este dominio, elige un reto. Hay diez formatos; cada dominio propone tres para empezar.</p></div>
        <span className="domain-pill">{domainName}</span>
      </div>
      <div className="game-picker" aria-label="Formatos de práctica">
        {gameFormats.map((game) => <button className={`${activeGame === game.id ? "active" : ""} ${recommended.includes(game.id) ? "recommended" : ""}`} key={game.id} onClick={() => setActiveGame(game.id)} type="button"><span aria-hidden="true">{game.icon}</span><strong>{game.shortLabel}</strong>{recommended.includes(game.id) && <em>recomendado</em>}</button>)}
      </div>
      <div className="practice-stage">
        {activeGame === "flashcards" && <FlashcardGame activeDomain={activeDomain} mastered={mastered} onToggleMastered={onToggleMastered} />}
        {activeGame === "connections" && <ConnectionsGame activeDomain={activeDomain} />}
        {activeGame === "ordering" && <OrderingGame activeDomain={activeDomain} />}
        {activeGame === "rapid" && <RapidGame activeDomain={activeDomain} />}
        {activeGame === "truefalse" && <TrueFalseGame activeDomain={activeDomain} />}
        {activeGame === "fillblank" && <FillBlankGame activeDomain={activeDomain} />}
        {activeGame === "decision" && <DecisionGame activeDomain={activeDomain} />}
        {activeGame === "memory" && <MemoryGame activeDomain={activeDomain} />}
        {activeGame === "sort" && <SortGame activeDomain={activeDomain} />}
        {activeGame === "antipattern" && <AntiPatternGame activeDomain={activeDomain} />}
      </div>
    </section>
  );
}

function FlashcardGame({ activeDomain, mastered, onToggleMastered }: ReviewArenaProps) {
  const cards = useMemo(() => flashcards.filter((card) => card.domain === activeDomain), [activeDomain]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  useEffect(() => { setIndex(0); setShowAnswer(false); }, [activeDomain]);
  const card = cards[index % cards.length];
  const masteredCard = mastered.includes(card.id);
  return <article className="game-card flashcard-game"><GameHeader gameId="flashcards" domainName={domains.find((domain) => domain.id === activeDomain)?.shortName ?? ""} />
    <button className={`flashcard ${showAnswer ? "is-flipped" : ""}`} onClick={() => setShowAnswer((value) => !value)} type="button" aria-label="Mostrar u ocultar respuesta">
      <span className="flashcard-side flashcard-front"><small>CONCEPTO · {index + 1}/{cards.length}</small><strong>{card.front}</strong><em>Haz clic para revelar la idea clave</em></span>
      <span className="flashcard-side flashcard-back"><small>IDEA CLAVE</small><strong>{card.back}</strong><em>{card.hint}</em></span>
    </button>
    <div className="game-actions"><button className="text-button" onClick={() => { setIndex((value) => (value + 1) % cards.length); setShowAnswer(false); }} type="button">Otra tarjeta →</button><button className={masteredCard ? "button button-secondary" : "button button-dark"} onClick={() => onToggleMastered(card.id)} type="button">{masteredCard ? "Dominada ✓" : "La dominé"}</button></div>
  </article>;
}

function ConnectionsGame({ activeDomain }: { activeDomain: DomainId }) {
  const pairs = matchPairsByDomain[activeDomain];
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [rightOrder, setRightOrder] = useState(() => shuffle(pairs));
  const [mistake, setMistake] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const leftRefs = useRef(new Map<string, HTMLButtonElement>());
  const rightRefs = useRef(new Map<string, HTMLButtonElement>());
  const [paths, setPaths] = useState<{ id: string; d: string }[]>([]);

  const updatePaths = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    const boardBox = board.getBoundingClientRect();
    setPaths(matched.flatMap((id) => {
      const left = leftRefs.current.get(id)?.getBoundingClientRect();
      const right = rightRefs.current.get(id)?.getBoundingClientRect();
      if (!left || !right) return [];
      const x1 = left.right - boardBox.left - 4;
      const y1 = left.top - boardBox.top + left.height / 2;
      const x2 = right.left - boardBox.left + 4;
      const y2 = right.top - boardBox.top + right.height / 2;
      const bend = Math.max(30, (x2 - x1) * .42);
      return [{ id, d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}` }];
    }));
  }, [matched]);

  useEffect(() => { setSelected(null); setMatched([]); setRightOrder(shuffle(pairs)); }, [activeDomain, pairs]);
  useEffect(() => { const raf = window.requestAnimationFrame(updatePaths); window.addEventListener("resize", updatePaths); return () => { window.cancelAnimationFrame(raf); window.removeEventListener("resize", updatePaths); }; }, [updatePaths, rightOrder]);

  function chooseRight(id: string) {
    if (!selected || matched.includes(id)) return;
    if (selected === id) setMatched((current) => [...current, id]);
    else { setMistake(id); window.setTimeout(() => setMistake(null), 450); }
    setSelected(null);
  }

  return <article className="game-card connections-game"><GameHeader gameId="connections" domainName={domains.find((domain) => domain.id === activeDomain)?.shortName ?? ""} />
    <p className="game-instruction">Elige un término y después su definición. Las parejas correctas quedan unidas por una línea.</p>
    <div className="match-board connected-board" ref={boardRef}>
      <svg aria-hidden="true" className="connection-lines" height="100%" width="100%">{paths.map((path) => <path d={path.d} key={path.id} />)}</svg>
      <div className="match-column">{pairs.map((pair) => <button className={`match-button ${selected === pair.left ? "selected" : ""} ${matched.includes(pair.left) ? "matched" : ""}`} disabled={matched.includes(pair.left)} key={pair.left} onClick={() => setSelected(pair.left)} ref={(node) => { if (node) leftRefs.current.set(pair.left, node); }} type="button">{matched.includes(pair.left) ? "✓ " : ""}{pair.left}</button>)}</div>
      <div className="match-column match-right">{rightOrder.map((pair) => <button className={`match-button ${matched.includes(pair.left) ? "matched" : ""} ${mistake === pair.left ? "mistake" : ""}`} disabled={matched.includes(pair.left) || !selected} key={pair.right} onClick={() => chooseRight(pair.left)} ref={(node) => { if (node) rightRefs.current.set(pair.left, node); }} type="button">{pair.right}</button>)}</div>
    </div>
    <div className="game-actions">{matched.length === pairs.length ? <span className="success-note">¡Mapa completo! Conectaste los {pairs.length} conceptos.</span> : <button className="text-button" onClick={() => { setMatched([]); setSelected(null); setRightOrder(shuffle(pairs)); }} type="button">Reordenar conexiones</button>}<span className="game-score">{matched.length}/{pairs.length}</span></div>
  </article>;
}

function OrderingGame({ activeDomain }: { activeDomain: DomainId }) {
  const correct = orderingChallenges[activeDomain];
  const [steps, setSteps] = useState(() => shuffle(correct));
  const [dragging, setDragging] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  useEffect(() => { setSteps(shuffle(correct)); setDragging(null); setChecked(false); }, [activeDomain, correct]);
  const ordered = steps.every((step, index) => step === correct[index]);
  function move(step: string, over: string) { if (step === over) return; setSteps((current) => { const next = [...current]; const from = next.indexOf(step); const to = next.indexOf(over); next.splice(from, 1); next.splice(to, 0, step); return next; }); setChecked(false); }
  function nudge(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= steps.length) return; const next = [...steps]; [next[index], next[target]] = [next[target], next[index]]; setSteps(next); setChecked(false); }
  return <article className="game-card ordering-game"><GameHeader gameId="ordering" domainName={domains.find((domain) => domain.id === activeDomain)?.shortName ?? ""} />
    <p className="game-instruction">Arrastra y suelta los pasos. Las flechas mantienen el juego accesible con teclado.</p>
    <ol className="step-list drag-list">{steps.map((step, index) => <li className={dragging === step ? "dragging" : ""} draggable key={step} onDragEnd={() => setDragging(null)} onDragOver={(event) => event.preventDefault()} onDragStart={() => setDragging(step)} onDrop={() => { if (dragging) move(dragging, step); setDragging(null); }}><span className="drag-handle" aria-hidden="true">⠿</span><span className="step-number">{index + 1}</span><span>{step}</span><span className="move-controls"><button aria-label={`Subir paso ${index + 1}`} onClick={() => nudge(index, -1)} type="button">↑</button><button aria-label={`Bajar paso ${index + 1}`} onClick={() => nudge(index, 1)} type="button">↓</button></span></li>)}</ol>
    <div className="order-footer">{checked && <span className={ordered ? "success-inline" : "error-inline"}>{ordered ? "✓ Flujo correcto" : "Aún no: revisa el orden de las decisiones."}</span>}<div><button className="text-button" onClick={() => { setSteps(shuffle(correct)); setChecked(false); }} type="button">Mezclar</button><button className="button button-dark" onClick={() => setChecked(true)} type="button">Comprobar</button></div></div>
  </article>;
}

function QuestionRound({ question, onNext, compact = false }: { question: Question; onNext: () => void; compact?: boolean }) {
  const [answer, setAnswer] = useState<number | null>(null);
  useEffect(() => setAnswer(null), [question.id]);
  const correct = answer === question.correctIndex;
  return <div className={`question-round ${compact ? "compact" : ""}`}><p className="round-scenario">{question.scenario}</p><h3>{question.prompt}</h3><div className="round-options">{question.options.map((option, index) => <button className={answer === index ? (correct ? "correct" : "wrong") : ""} disabled={answer !== null} key={option} onClick={() => setAnswer(index)} type="button"><span>{String.fromCharCode(65 + index)}</span>{option}</button>)}</div>{answer !== null && <div className={correct ? "round-feedback correct" : "round-feedback wrong"}><strong>{correct ? "¡Correcto!" : "Casi."}</strong><p>{question.explanation}</p><button className="button button-dark" onClick={onNext} type="button">Siguiente →</button></div>}</div>;
}

function RapidGame({ activeDomain }: { activeDomain: DomainId }) {
  const domainQuestions = useMemo(() => questions.filter((question) => question.domain === activeDomain), [activeDomain]);
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [activeDomain]);
  return <article className="game-card single-game"><GameHeader gameId="rapid" domainName={domains.find((domain) => domain.id === activeDomain)?.shortName ?? ""} /><QuestionRound compact question={domainQuestions[index % domainQuestions.length]} onNext={() => setIndex((value) => value + 1)} /></article>;
}

function TrueFalseGame({ activeDomain }: { activeDomain: DomainId }) {
  const statements = trueFalseStatements[activeDomain];
  const [index, setIndex] = useState(0); const [answer, setAnswer] = useState<boolean | null>(null);
  useEffect(() => { setIndex(0); setAnswer(null); }, [activeDomain]);
  const statement = statements[index % statements.length]; const correct = answer === statement.truth;
  return <article className="game-card single-game"><GameHeader gameId="truefalse" domainName={domains.find((domain) => domain.id === activeDomain)?.shortName ?? ""} /><div className="binary-game"><p className="binary-label">¿ES CIERTO?</p><h3>{statement.text}</h3><div><button className={answer === true ? (correct ? "correct" : "wrong") : ""} disabled={answer !== null} onClick={() => setAnswer(true)} type="button">Verdadero</button><button className={answer === false ? (correct ? "correct" : "wrong") : ""} disabled={answer !== null} onClick={() => setAnswer(false)} type="button">Falso</button></div>{answer !== null && <div className={correct ? "round-feedback correct" : "round-feedback wrong"}><strong>{correct ? "Exacto." : "No esta vez."}</strong><p>{statement.explanation}</p><button className="button button-dark" onClick={() => { setIndex((value) => value + 1); setAnswer(null); }} type="button">Otra afirmación</button></div>}</div></article>;
}

function FillBlankGame({ activeDomain }: { activeDomain: DomainId }) {
  const challenge = blankChallenges[activeDomain]; const [answer, setAnswer] = useState<string | null>(null);
  useEffect(() => setAnswer(null), [activeDomain]); const correct = answer === challenge.answer;
  return <article className="game-card single-game"><GameHeader gameId="fillblank" domainName={domains.find((domain) => domain.id === activeDomain)?.shortName ?? ""} /><div className="fill-game"><h3>{challenge.prompt}</h3><div className="fill-options">{challenge.options.map((option) => <button className={answer === option ? (correct ? "correct" : "wrong") : ""} disabled={answer !== null} key={option} onClick={() => setAnswer(option)} type="button">{option}</button>)}</div>{answer !== null && <div className={correct ? "round-feedback correct" : "round-feedback wrong"}><strong>{correct ? "Muy bien." : "Inténtalo de nuevo en el siguiente reto."}</strong><p>{challenge.explanation}</p><button className="button button-dark" onClick={() => setAnswer(null)} type="button">Reintentar</button></div>}</div></article>;
}

function DecisionGame({ activeDomain }: { activeDomain: DomainId }) {
  const domainQuestions = useMemo(() => questions.filter((question) => question.domain === activeDomain), [activeDomain]); const [index, setIndex] = useState(1);
  useEffect(() => setIndex(1), [activeDomain]);
  return <article className="game-card single-game decision-game"><GameHeader gameId="decision" domainName={domains.find((domain) => domain.id === activeDomain)?.shortName ?? ""} /><p className="game-instruction">No memorices una palabra: decide qué mecanismo resuelve la causa raíz.</p><QuestionRound question={domainQuestions[index % domainQuestions.length]} onNext={() => setIndex((value) => value + 2)} /></article>;
}

function MemoryGame({ activeDomain }: { activeDomain: DomainId }) {
  const pairs = matchPairsByDomain[activeDomain].slice(0, 3); const [cards, setCards] = useState(() => shuffle(pairs.flatMap((pair) => [{ id: `${pair.left}:term`, pair: pair.left, text: pair.left }, { id: `${pair.left}:definition`, pair: pair.left, text: pair.right }]))); const [open, setOpen] = useState<string[]>([]); const [found, setFound] = useState<string[]>([]);
  function reset() { setCards(shuffle(pairs.flatMap((pair) => [{ id: `${pair.left}:term`, pair: pair.left, text: pair.left }, { id: `${pair.left}:definition`, pair: pair.left, text: pair.right }]))); setOpen([]); setFound([]); }
  useEffect(() => reset(), [activeDomain]);
  function reveal(card: typeof cards[number]) { if (open.includes(card.id) || found.includes(card.pair) || open.length === 2) return; const next = [...open, card.id]; setOpen(next); if (next.length === 2) { const first = cards.find((item) => item.id === next[0])!; if (first.pair === card.pair) { window.setTimeout(() => { setFound((current) => [...current, card.pair]); setOpen([]); }, 280); } else window.setTimeout(() => setOpen([]), 700); } }
  return <article className="game-card memory-game"><GameHeader gameId="memory" domainName={domains.find((domain) => domain.id === activeDomain)?.shortName ?? ""} /><p className="game-instruction">Encuentra cada término con su significado. No son pares idénticos: usa la memoria conceptual.</p><div className="memory-board">{cards.map((card) => { const shown = open.includes(card.id) || found.includes(card.pair); return <button className={shown ? "revealed" : ""} key={card.id} onClick={() => reveal(card)} type="button"><span>{shown ? card.text : "?"}</span></button>; })}</div><div className="game-actions">{found.length === pairs.length ? <span className="success-note">¡Las tres parejas están completas!</span> : <span className="game-score">{found.length}/{pairs.length} parejas</span>}<button className="text-button" onClick={reset} type="button">Mezclar de nuevo</button></div></article>;
}

function SortGame({ activeDomain }: { activeDomain: DomainId }) {
  const items = sortItems[activeDomain]; const [index, setIndex] = useState(0); const [answer, setAnswer] = useState<SortItem["category"] | null>(null);
  useEffect(() => { setIndex(0); setAnswer(null); }, [activeDomain]); const item = items[index % items.length]; const correct = answer === item.category;
  return <article className="game-card single-game"><GameHeader gameId="sort" domainName={domains.find((domain) => domain.id === activeDomain)?.shortName ?? ""} /><div className="binary-game"><p className="binary-label">CLASIFICA LA DECISIÓN</p><h3>{item.text}</h3><div><button className={answer === "Patrón" ? (correct ? "correct" : "wrong") : ""} disabled={answer !== null} onClick={() => setAnswer("Patrón")} type="button">Patrón</button><button className={answer === "Antipatrón" ? (correct ? "correct" : "wrong") : ""} disabled={answer !== null} onClick={() => setAnswer("Antipatrón")} type="button">Antipatrón</button></div>{answer !== null && <div className={correct ? "round-feedback correct" : "round-feedback wrong"}><strong>{correct ? "Bien clasificado." : "Revisa el mecanismo."}</strong><p>{item.explanation}</p><button className="button button-dark" onClick={() => { setIndex((value) => value + 1); setAnswer(null); }} type="button">Siguiente</button></div>}</div></article>;
}

function AntiPatternGame({ activeDomain }: { activeDomain: DomainId }) {
  const challenge = antiPatterns[activeDomain]; const [answer, setAnswer] = useState<string | null>(null);
  useEffect(() => setAnswer(null), [activeDomain]); const correct = answer === challenge.answer;
  return <article className="game-card single-game"><GameHeader gameId="antipattern" domainName={domains.find((domain) => domain.id === activeDomain)?.shortName ?? ""} /><div className="fill-game"><h3>{challenge.prompt}</h3><div className="fill-options">{challenge.options.map((option) => <button className={answer === option ? (correct ? "correct" : "wrong") : ""} disabled={answer !== null} key={option} onClick={() => setAnswer(option)} type="button">{option}</button>)}</div>{answer !== null && <div className={correct ? "round-feedback correct" : "round-feedback wrong"}><strong>{correct ? "Lo detectaste." : "La pista está en la causa raíz."}</strong><p>{challenge.explanation}</p><button className="button button-dark" onClick={() => setAnswer(null)} type="button">Probar otra vez</button></div>}</div></article>;
}
