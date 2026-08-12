import { domains, examCoverage, examScenarios } from "@/src/lib/content";

export function CoverageMap({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <details className="coverage-map-compact">
        <summary><span aria-hidden="true">◎</span><span><strong>Mapa de cobertura</strong><small>5 dominios · 8 escenarios</small></span><b aria-hidden="true">⌄</b></summary>
        <div className="compact-coverage-body">
          <p>Todo el temario público de la guía está mapeado en la app.</p>
          <ul>{examCoverage.map((area) => <li key={area.domain}><strong>{area.title}</strong><span>{area.topics.length} bloques</span></li>)}</ul>
          <p className="compact-warning"><strong>Escenario 8:</strong> área reportada sin temario público verificable.</p>
        </div>
      </details>
    );
  }

  return (
    <section className="coverage-map" aria-labelledby="coverage-title">
      <div className="coverage-intro">
        <div>
          <p className="eyebrow teal">MAPA DE COBERTURA</p>
          <h2 id="coverage-title">Todo el temario público, sin puntos ciegos ocultos</h2>
          <p>Este mapa traduce la guía fuente a temas estudiables. Cada tema tiene tarjetas o preguntas dentro de su dominio.</p>
        </div>
        <span className="coverage-badge">5/5 dominios</span>
      </div>

      <div className="coverage-domains">
        {examCoverage.map((area) => {
          const domain = domains.find((item) => item.id === area.domain)!;
          return (
            <details key={area.domain} open={area.domain === "agents"}>
              <summary>
                <span className={`coverage-dot ${domain.color}`} />
                <span><strong>{area.title}</strong><small>{area.topics.length} bloques cubiertos · {domain.weight}%</small></span>
                <span className="coverage-chevron" aria-hidden="true">⌄</span>
              </summary>
              <ul>{area.topics.map((topic) => <li key={topic}>{topic}</li>)}</ul>
            </details>
          );
        })}
      </div>

      <div className="scenario-coverage">
        <div className="scenario-heading"><h3>Escenarios de práctica</h3><span>8 reportados</span></div>
        <div className="scenario-grid">
          {examScenarios.map((scenario) => (
            <article className={scenario.coverage === "Área reportada" ? "scenario-card limited" : "scenario-card"} key={scenario.number}>
              <span>0{scenario.number}</span>
              <div><strong>{scenario.title}</strong><p>{scenario.note}</p></div>
              <em>{scenario.coverage === "Cubierto" ? "✓" : "!"} {scenario.coverage}</em>
            </article>
          ))}
        </div>
        <p className="coverage-disclaimer"><strong>Transparencia:</strong> el material fuente reporta el escenario 8, pero declara que no hay contenido público verificable para él. La app cubre principios transferibles de diseño de tools agénticas, sin afirmar que sustituya material oficial no publicado.</p>
      </div>
    </section>
  );
}
