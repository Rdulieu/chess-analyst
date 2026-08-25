import { useEffect, useState } from "react";
import { fetchConfrontationSummary } from "../api";
import { ConfusionMatrixTable } from "../features/confrontation/ConfusionMatrixTable";
import { KeyMomentReadout } from "../features/confrontation/KeyMomentReadout";
import { Figure } from "../features/confrontation/Figure";
import { ScopedPage } from "../features/profiles/ScopedPage";
import { ErrorBoundary } from "../components/ErrorBoundary";
import type { ConfrontationSummary, Profile } from "../types";

/**
 * **Where I read well and where I read badly** (`/confrontation`) — the figure
 * US-16b exists for. That claim is about **tens** of readings, never about one,
 * which is why this screen exists beside the per-Game confrontation rather than
 * instead of it.
 *
 * The summary is the per-Game records **summed** (ADR-0017). Reconciliation is
 * the definition and not a test we hope passes: the Player can open one Game they
 * know and see how a global figure was arrived at, and advice they cannot check
 * is worth nothing.
 *
 * In the `Nav`, unlike the per-Game confrontation: this one is about the whole
 * `Profile`, not about a Game reached from a list.
 */
export function ConfrontationsPage() {
  return <ScopedPage>{(profile) => <SummaryOfAllReadings profile={profile} />}</ScopedPage>;
}

function SummaryOfAllReadings({ profile }: { profile: Profile }) {
  const [summary, setSummary] = useState<ConfrontationSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    fetchConfrontationSummary(profile.id)
      .then((result) => live && setSummary(result))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [profile.id]);

  return (
    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading">Mes lectures face au moteur</h2>
      <ErrorBoundary key={profile.id}>
        {failed && <p>Impossible de charger le bilan de vos lectures.</p>}
        {!failed && summary === null && <p>Chargement du bilan…</p>}
        {summary !== null &&
          (summary.readings === 0 ? <NoReadings /> : <Summary summary={summary} />)}
      </ErrorBoundary>
    </section>
  );
}

/**
 * A `Profile` that has sealed nothing yet gets **its own screen**, not a summary
 * of zeros. Zeros here would read as *you read badly*; the truth is that there is
 * nothing to read yet, and those are different things.
 */
function NoReadings() {
  return (
    <div data-part="no-readings">
      <p>
        <strong>Aucune lecture scellée pour ce profil.</strong> Il n'y a donc rien à confronter, et
        pas de bilan à en tirer.
      </p>
      <p>
        Ouvrez une partie analysée, écrivez votre lecture, puis scellez-la : c'est le scellement qui
        fixe ce qui sera confronté.
      </p>
    </div>
  );
}

function Summary({ summary }: { summary: ConfrontationSummary }) {
  const { countedMoves, examined, scorable, agreed, matrix } = summary.severity;

  return (
    <>
      <div data-part="summary-provenance">
        <p>
          Sur <strong>{summary.readings} lectures scellées</strong> —{" "}
          {summary.provenance.unaided} lue{summary.provenance.unaided > 1 ? "s" : ""} à l'aveugle,{" "}
          {summary.provenance.informed} lue{summary.provenance.informed > 1 ? "s" : ""} informée
          {summary.provenance.informed > 1 ? "s" : ""}.
        </p>
        {/* The count travels because the Player is the one who judges whether a
            handful of readings is a tendency. It is NOT used to slice the
            figures: two sets of three on a sample this size would say less. */}
        <p data-part="figure-note">
          Ces chiffres ne sont découpés par aucun axe. Une lecture s'écrit à la main, donc
          l'échantillon se compte en dizaines de parties là où vos agrégats de jeu en comptent des
          milliers — trancher une poignée de lectures ne dirait rien.
        </p>
      </div>

      <div data-part="confrontation-severity">
        <Figure
          name="Ce que j'ai examiné"
          of={countedMoves}
          count={examined}
          unit="coups comptés"
          singular="coup compté"
          note="Sur les coups que l'analyse vous compte, toutes vos lectures scellées confondues."
        />
        <Figure
          name="Ce que j'ai vu juste"
          of={scorable}
          count={agreed}
          unit="verdicts confrontables"
          singular="verdict confrontable"
          note="Sur les verdicts que vous avez posés. Un désaccord dit où regarder, pas qui se trompe."
        />
        <KeyMomentReadout keyMoments={{ ...summary.keyMoments, misses: [] }} />
      </div>

      {/* The matrix folds whole, so the direction of the bias reads at this scale
          from the very same cells — one derivation, two altitudes. */}
      <ConfusionMatrixTable matrix={matrix} />

      <p data-part="divergence-note">
        Là où vos lectures et le moteur se séparent, ce sont des <strong>divergences</strong> :
        elles disent où regarder, pas qui se trompe. Juger notre propre analyse par votre accord
        avec elle supposerait que vous avez raison — ce qui est précisément ce que rien n'établit.
      </p>
      <p data-part="figure-note">
        Chaque chiffre ci-dessus est la somme de vos confrontations partie par partie : ouvrez une
        partie que vous connaissez pour voir comment il a été obtenu.
      </p>
    </>
  );
}
