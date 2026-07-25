import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Latex } from "./components/Latex";
import { ContentError } from "./data/contentRepository";
import type {
  AvailableContent,
  ContentTrack,
  DifficultyLabel,
  ProgressStatus,
  PublicQuestion,
  QuestionSummary,
} from "./domain/content";
import {
  BrowserProgressRepository,
  type ProgressRepository,
} from "./domain/progress";
import { pickRandomQuestions } from "./domain/quickSession";
import { pickRoastMessage } from "./domain/roasts";
import { pickPraiseMessage } from "./domain/praise";
import { LearningSession } from "./domain/session";
import { useContent } from "./hooks/useContent";

const difficultyNames: Record<DifficultyLabel, string> = {
  intro: "やさしい",
  standard: "ふつう",
  challenge: "チャレンジ",
};

const statusNames: Record<ProgressStatus, string> = {
  "not-started": "まだ",
  "in-progress": "途中",
  completed: "できた",
};

function statusFor(summary: QuestionSummary, progress: ProgressRepository): ProgressStatus {
  return progress.get(summary.id, summary.revision)?.status ?? "not-started";
}

function useIOSScrollGuard(surfaceKey: string) {
  useEffect(() => {
    const surface = document.querySelector<HTMLElement>(".app-frame");
    if (!surface) return;
    let startY = 0;

    const rememberStart = (event: TouchEvent) => {
      startY = event.touches[0]?.clientY ?? 0;
    };
    const containAtEdges = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY ?? startY;
      const deltaY = currentY - startY;
      const atTop = surface.scrollTop <= 0;
      const atBottom =
        surface.scrollTop + surface.clientHeight >= surface.scrollHeight - 1;
      if ((atTop && deltaY > 0) || (atBottom && deltaY < 0)) {
        event.preventDefault();
      }
    };

    surface.addEventListener("touchstart", rememberStart, { passive: true });
    surface.addEventListener("touchmove", containAtEdges, { passive: false });
    return () => {
      surface.removeEventListener("touchstart", rememberStart);
      surface.removeEventListener("touchmove", containAtEdges);
    };
  }, [surfaceKey]);
}

function Brand() {
  return (
    <span className="brand">
      <span className="brand-flower" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <b />
      </span>
      <span>ひとくち数学</span>
    </span>
  );
}

interface HomeProps {
  content: AvailableContent;
  track: ContentTrack;
  progress: ProgressRepository;
  onTrackChange: (track: ContentTrack) => void;
  onStart: (unitId: string) => void;
  onLibrary: () => void;
}

function Home({ content, track, progress, onTrackChange, onStart, onLibrary }: HomeProps) {
  const [unitId, setUnitId] = useState("all");
  const units = useMemo(
    () =>
      Array.from(
        new Map(content.index.questions.map((question) => [question.unit.id, question.unit])).values(),
      ),
    [content],
  );
  const completedCount = content.index.questions.filter(
    (question) => statusFor(question, progress) === "completed",
  ).length;
  const percent = Math.round((completedCount / content.index.questionCount) * 100);

  return (
    <main className="app-frame home-screen">
      <header className="home-header">
        <Brand />
        <button type="button" className="round-icon" onClick={onLibrary} aria-label="問題一覧を開く">
          <span />
          <span />
          <span />
        </button>
      </header>

      {content.usedFallback && (
        <aside className="offline-note" role="status">
          前回ひらいた問題を使っています
        </aside>
      )}

      <div className="track-switch" aria-label="学年を切り替える">
        <button
          type="button"
          className={track === "grade-3" ? "active" : undefined}
          aria-pressed={track === "grade-3"}
          onClick={() => onTrackChange("grade-3")}
        >
          小学3年生
        </button>
        <button
          type="button"
          className={track === "high-school" ? "active" : undefined}
          aria-pressed={track === "high-school"}
          onClick={() => onTrackChange("high-school")}
        >
          高校数学
        </button>
      </div>

      <section className="hello">
        <span className="hello-spark" aria-hidden="true">
          ✦
        </span>
        <p>おつかれさま。</p>
        <h1>
          ちょっとだけ、
          <br />
          {track === "grade-3" ? "算数しよっか。" : "数学しよっか。"}
        </h1>
      </section>

      <section className="quick-card" aria-labelledby="quick-title">
        <div className="quick-card-top">
          <span className="time-pill">約5分</span>
          <div className="mini-dots" aria-label="3問">
            <i />
            <i />
            <i />
          </div>
        </div>
        <div className="quick-illustration" aria-hidden="true">
          <span className="pencil">×</span>
          <span className="paper-line line-one" />
          <span className="paper-line line-two" />
          <span className="paper-answer">＝ ?</span>
        </div>
        <div className="quick-copy">
          <p>QUICK LESSON</p>
          <h2 id="quick-title">ランダム3問</h2>
          <span>
            {track === "grade-3"
              ? "200問から、まだできていない問題を優先します"
              : "未クリアの問題から優先して選びます"}
          </span>
        </div>

        <label className="unit-picker">
          <span>出題範囲</span>
          <select value={unitId} onChange={(event) => setUnitId(event.target.value)}>
            <option value="all">ぜんぶからおまかせ</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.name}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="start-button" onClick={() => onStart(unitId)}>
          <span>3問だけやる</span>
          <span className="start-arrow" aria-hidden="true">
            →
          </span>
        </button>
      </section>

      <section className="today-card" aria-label="学習の進み具合">
        <div className="today-copy">
          <span className="tiny-label">MY PROGRESS</span>
          <strong>
            {completedCount}
            <small> / {content.index.questionCount}問</small>
          </strong>
          <p>{completedCount === 0 ? "最初の1問から、ゆっくりでOK" : "ちゃんと積み上がってるよ"}</p>
        </div>
        <div
          className="progress-ring"
          style={{ "--progress": `${percent * 3.6}deg` } as React.CSSProperties}
          aria-label={`${percent}%完了`}
        >
          <span>{percent}%</span>
        </div>
      </section>

      <button type="button" className="library-link" onClick={onLibrary}>
        <span>
          <b>問題を選んで解く</b>
          <small>単元や難しさから探せます</small>
        </span>
        <span aria-hidden="true">›</span>
      </button>

      <p className="content-version">content {content.contentVersion}</p>
    </main>
  );
}

interface LibraryProps {
  content: AvailableContent;
  progress: ProgressRepository;
  onOpen: (summary: QuestionSummary) => void;
  onBack: () => void;
}

function Library({ content, progress, onOpen, onBack }: LibraryProps) {
  const [unit, setUnit] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const units = useMemo(
    () =>
      Array.from(
        new Map(content.index.questions.map((question) => [question.unit.id, question.unit])).values(),
      ),
    [content],
  );
  const filtered = content.index.questions.filter(
    (question) =>
      (unit === "all" || question.unit.id === unit) &&
      (difficulty === "all" || question.difficulty.label === difficulty),
  );

  return (
    <main className="app-frame library-screen">
      <header className="sub-header">
        <button type="button" className="back-button" onClick={onBack} aria-label="ホームへ戻る">
          ←
        </button>
        <h1>問題を選ぶ</h1>
        <span className="header-spacer" />
      </header>

      <div className="compact-filters">
        <label>
          <span>単元</span>
          <select value={unit} onChange={(event) => setUnit(event.target.value)}>
            <option value="all">すべて</option>
            {units.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>難しさ</span>
          <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="all">すべて</option>
            {Object.entries(difficultyNames).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="list-count">{filtered.length}問</p>
      <div className="question-list">
        {filtered.map((question) => {
          const status = statusFor(question, progress);
          return (
            <button
              type="button"
              className="question-row"
              key={`${question.id}:${question.revision}`}
              onClick={() => onOpen(question)}
            >
              <span className={`row-state state-${status}`} aria-hidden="true">
                {status === "completed" ? "✓" : status === "in-progress" ? "…" : ""}
              </span>
              <span className="row-copy">
                <strong>{question.unit.name}</strong>
                <small>
                  {difficultyNames[question.difficulty.label]} · {statusNames[status]}
                </small>
              </span>
              <span className="row-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}

interface PlayerProps {
  question: PublicQuestion;
  progress: ProgressRepository;
  quickPosition?: { current: number; total: number };
  onBack: () => void;
  onDone: () => void;
}

interface FlyingAnswer {
  id: number;
  label: string;
  style: CSSProperties & {
    "--fly-x": string;
    "--fly-y": string;
    "--flight-duration": string;
  };
}

function Player({ question, progress, quickPosition, onBack, onDone }: PlayerProps) {
  const saved = progress.get(question.id, question.revision);
  const [session, setSession] = useState(
    () =>
      new LearningSession(
        question,
        Math.random,
        saved?.status === "in-progress" ? saved.stepIndex : 0,
      ),
  );
  const [, render] = useState(0);
  const formulaRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const roastTimer = useRef<number | undefined>(undefined);
  const lastRoast = useRef<string | undefined>(undefined);
  const [flyingAnswer, setFlyingAnswer] = useState<FlyingAnswer>();
  const [formulaBurst, setFormulaBurst] = useState(false);
  const [formulaTransformed, setFormulaTransformed] = useState(false);
  const [correctFeedbackReady, setCorrectFeedbackReady] = useState(false);
  const [roast, setRoast] = useState<{ id: number; text: string }>();
  const state = session.state;
  const step = question.solutionSteps[state.stepIndex];

  useEffect(
    () => () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      if (roastTimer.current) window.clearTimeout(roastTimer.current);
    },
    [],
  );

  const save = (status: "in-progress" | "completed", stepIndex: number) => {
    progress.save({
      questionId: question.id,
      revision: question.revision,
      status,
      stepIndex,
      updatedAt: new Date().toISOString(),
    });
  };

  const showRoast = () => {
    if (roastTimer.current) window.clearTimeout(roastTimer.current);
    const text = pickRoastMessage(Math.random, lastRoast.current);
    lastRoast.current = text;
    setRoast({ id: Date.now(), text });
    roastTimer.current = window.setTimeout(() => setRoast(undefined), 3000);
  };

  const choose = (choiceId: string, button: HTMLButtonElement) => {
    const nextState = session.select(choiceId);
    save("in-progress", session.state.stepIndex);
    if (nextState.phase !== "correct") {
      showRoast();
      render((value) => value + 1);
      return;
    }

    const target = formulaRef.current?.getBoundingClientRect();
    const source = button.getBoundingClientRect();
    const choice = step.choices.find((item) => item.id === choiceId);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reducedMotion ? 0 : 780;
    setFormulaTransformed(false);
    setCorrectFeedbackReady(false);
    if (target) {
      setFlyingAnswer({
        id: Date.now(),
        label: choice?.text || "正解",
        style: {
          left: source.left,
          top: source.top,
          width: Math.min(source.width, 310),
          "--fly-x": `${target.left + target.width / 2 - (source.left + source.width / 2)}px`,
          "--fly-y": `${target.top + target.height / 2 - (source.top + source.height / 2)}px`,
          "--flight-duration": `${duration}ms`,
        },
      });
    }
    timers.current.push(
      window.setTimeout(() => {
        setFlyingAnswer(undefined);
        setFormulaTransformed(true);
        setFormulaBurst(true);
      }, Math.max(0, duration - 40)),
      window.setTimeout(() => {
        setFormulaBurst(false);
        setCorrectFeedbackReady(true);
        render((value) => value + 1);
      }, duration + 300),
    );
    render((value) => value + 1);
  };

  const next = () => {
    session.next();
    const nextState = session.state;
    save(nextState.phase === "completed" ? "completed" : "in-progress", nextState.stepIndex);
    setFormulaTransformed(false);
    setCorrectFeedbackReady(false);
    setFormulaBurst(false);
    setFlyingAnswer(undefined);
    render((value) => value + 1);
  };

  const restart = () => {
    progress.remove(question.id, question.revision);
    setSession(new LearningSession(question));
    setFormulaTransformed(false);
    setCorrectFeedbackReady(false);
    setFormulaBurst(false);
    setFlyingAnswer(undefined);
    setRoast(undefined);
  };

  return (
    <main className="app-frame player-screen">
      {flyingAnswer && (
        <div
          key={flyingAnswer.id}
          className="flying-answer"
          style={flyingAnswer.style}
          aria-hidden="true"
        >
          <span>✓</span>
          <strong>{flyingAnswer.label}</strong>
        </div>
      )}
      {roast && (
        <div key={roast.id} className="roast-popup" role="status" aria-live="assertive">
          <span>不正解</span>
          <strong>{roast.text}</strong>
        </div>
      )}
      <header className="sub-header player-header">
        <button type="button" className="back-button" onClick={onBack} aria-label="やめてホームへ戻る">
          ×
        </button>
        <div className="lesson-dots" aria-label={quickPosition ? `${quickPosition.current}問目` : "1問"}>
          {Array.from({ length: quickPosition?.total ?? 1 }, (_, index) => (
            <i
              key={index}
              className={index < (quickPosition?.current ?? 1) ? "filled" : undefined}
            />
          ))}
        </div>
        <button type="button" className="reset-button" onClick={restart}>
          やり直す
        </button>
      </header>

      <article className="player">
        <div className="question-meta">
          <span>{question.unit.name}</span>
          <span>{difficultyNames[question.difficulty.label]}</span>
        </div>
        <div className="step-counter">
          <span>
            STEP {Math.min(state.stepIndex + 1, question.solutionSteps.length)} /{" "}
            {question.solutionSteps.length}
          </span>
          <div>
            {question.solutionSteps.map((item, index) => (
              <i key={item.stepId} className={index <= state.stepIndex ? "active" : undefined} />
            ))}
          </div>
        </div>

        <h1>{question.problemText}</h1>
        {question.problemLatex && (
          <div className="problem-math">
            <Latex value={question.problemLatex} block />
          </div>
        )}

        {state.phase === "completed" ? (
          <section className="completion" aria-live="polite">
            <span className="completion-face" aria-hidden="true">
              <i>•</i>
              <i>•</i>
              <b>⌣</b>
            </span>
            <p className="tiny-label">NICE!</p>
            <h2>1問できた！</h2>
            <div className="answer-box">
              <span>こたえ</span>
              <Latex value={question.answer.finalAnswerLatex} block />
            </div>
            <details className="solution-note">
              <summary>解き方をおさらい</summary>
              <p>{question.solutionPlan.summary}</p>
            </details>
            <button type="button" className="start-button next-question" onClick={onDone}>
              <span>
                {quickPosition && quickPosition.current < quickPosition.total
                  ? "次の問題へ"
                  : quickPosition
                    ? "3問の結果を見る"
                    : "ホームへ戻る"}
              </span>
              <span className="start-arrow" aria-hidden="true">
                →
              </span>
            </button>
          </section>
        ) : (
          <section className="step-panel" aria-labelledby="step-question">
            <div
              ref={formulaRef}
              className={`current-formula${formulaBurst ? " exploding" : ""}${formulaTransformed ? " transformed" : ""}`}
            >
              <span>{formulaTransformed ? "変形すると" : "いまの式"}</span>
              <Latex value={formulaTransformed ? step.afterLatex : step.beforeLatex} block />
              {formulaBurst && (
                <div className="formula-explosion" aria-hidden="true">
                  {Array.from({ length: 10 }, (_, index) => (
                    <i key={index} />
                  ))}
                  <b>BOOM!</b>
                </div>
              )}
            </div>
            <h2 id="step-question">次はどうする？</h2>
            <div className="choices">
              {session.choices.map((choice, index) => {
                const selected = state.selectedChoiceId === choice.id;
                const correctness =
                  selected && state.phase === "correct"
                    ? " correct"
                    : selected
                      ? " incorrect"
                      : "";
                return (
                  <button
                    type="button"
                    key={choice.id}
                    className={`choice${correctness}`}
                    disabled={state.phase === "correct"}
                    onClick={(event) => choose(choice.id, event.currentTarget)}
                  >
                    <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
                    <span className="choice-copy">
                      <strong>{choice.text}</strong>
                      {choice.latex && <Latex value={choice.latex} />}
                    </span>
                    {selected && (
                      <span className="choice-result" aria-hidden="true">
                        {state.phase === "correct" ? "✓" : "×"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {state.feedback && (state.phase !== "correct" || correctFeedbackReady) && (
              <div
                className={`feedback ${state.phase === "correct" ? "feedback-correct" : "feedback-wrong"}`}
                role="status"
                aria-live="polite"
              >
                <strong>{state.phase === "correct" ? "いい感じ！" : "おしい！"}</strong>
                <p>{state.feedback}</p>
                {state.phase === "correct" && (
                  <>
                    <button type="button" className="continue-button" onClick={next} autoFocus>
                      {state.stepIndex === question.solutionSteps.length - 1
                        ? "答えを見る"
                        : "つづける"}{" "}
                      <span aria-hidden="true">→</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </section>
        )}
      </article>
    </main>
  );
}

interface SessionCompleteProps {
  questions: QuestionSummary[];
  onAgain: () => void;
  onHome: () => void;
}

function SessionComplete({ questions, onAgain, onHome }: SessionCompleteProps) {
  const praise = useMemo(() => pickPraiseMessage(), []);

  return (
    <main className="app-frame session-complete">
      <div className="confetti" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <span className="big-flower" aria-hidden="true">
        🌼
      </span>
      <p className="tiny-label">TODAY&apos;S LESSON</p>
      <h1>
        3問、おつかれ
        <br />
        さまでした！
      </h1>
      <p className="completion-praise">
        <span aria-hidden="true">★</span>
        <strong>{praise}</strong>
      </p>
      <p className="complete-copy">空き時間でここまでできたら、今日はもう十分。</p>

      <div className="completed-list">
        {questions.map((question, index) => (
          <div key={`${question.id}:${question.revision}`}>
            <span>{index + 1}</span>
            <p>
              <strong>{question.unit.name}</strong>
              <small>{difficultyNames[question.difficulty.label]}</small>
            </p>
            <b aria-label="完了">✓</b>
          </div>
        ))}
      </div>

      <button type="button" className="start-button" onClick={onAgain}>
        <span>もう3問やる</span>
        <span className="start-arrow" aria-hidden="true">
          →
        </span>
      </button>
      <button type="button" className="home-text-button" onClick={onHome}>
        今日はここまで
      </button>
    </main>
  );
}

export default function App() {
  const [track, setTrack] = useState<ContentTrack>(() => {
    try {
      return window.localStorage.getItem("hana-math:track:v1") === "grade-3"
        ? "grade-3"
        : "high-school";
    } catch {
      return "high-school";
    }
  });
  const contentState = useContent(track);
  const progressRef = useRef<ProgressRepository | null>(null);
  if (!progressRef.current) progressRef.current = new BrowserProgressRepository();
  const [screen, setScreen] = useState<"home" | "library" | "complete">("home");
  const [selected, setSelected] = useState<QuestionSummary>();
  const [question, setQuestion] = useState<PublicQuestion>();
  const [questionError, setQuestionError] = useState<string>();
  const [questionLoading, setQuestionLoading] = useState(false);
  const [quickQueue, setQuickQueue] = useState<QuestionSummary[]>();
  const [quickIndex, setQuickIndex] = useState(0);
  const scrollSurfaceKey = `${screen}:${selected?.id ?? "none"}:${questionLoading ? "loading" : "ready"}`;
  useIOSScrollGuard(scrollSurfaceKey);

  const changeTrack = (nextTrack: ContentTrack) => {
    if (nextTrack === track) return;
    setSelected(undefined);
    setQuestion(undefined);
    setQuestionError(undefined);
    setQuickQueue(undefined);
    setQuickIndex(0);
    setScreen("home");
    try {
      window.localStorage.setItem("hana-math:track:v1", nextTrack);
    } catch {
      // The selected track still applies for this visit.
    }
    setTrack(nextTrack);
  };

  const open = async (summary: QuestionSummary) => {
    if (contentState.status !== "ready" || !contentState.repository || !contentState.content) return;
    setSelected(summary);
    setQuestion(undefined);
    setQuestionError(undefined);
    setQuestionLoading(true);
    try {
      setQuestion(await contentState.repository.loadQuestion(contentState.content, summary));
    } catch (error) {
      console.error("Question load failed", error);
      setQuestionError(
        error instanceof ContentError ? error.userMessage : "問題を読み込めませんでした。",
      );
    } finally {
      setQuestionLoading(false);
    }
  };

  const startQuick = (unitId = "all") => {
    if (contentState.status !== "ready" || !contentState.content) return;
    const candidates = contentState.content.index.questions.filter(
      (summary) => unitId === "all" || summary.unit.id === unitId,
    );
    const queue = pickRandomQuestions(
      candidates,
      3,
      Math.random,
      (summary) => statusFor(summary, progressRef.current!) !== "completed",
    );
    setQuickQueue(queue);
    setQuickIndex(0);
    setScreen("home");
    if (queue[0]) void open(queue[0]);
  };

  const leavePlayer = () => {
    setSelected(undefined);
    setQuestion(undefined);
    setQuickQueue(undefined);
    setQuickIndex(0);
    setScreen("home");
  };

  const finishQuestion = () => {
    if (!quickQueue) {
      leavePlayer();
      return;
    }
    const nextIndex = quickIndex + 1;
    if (nextIndex < quickQueue.length) {
      setQuickIndex(nextIndex);
      void open(quickQueue[nextIndex]);
      return;
    }
    setSelected(undefined);
    setQuestion(undefined);
    setScreen("complete");
  };

  if (contentState.status === "loading") {
    return (
      <main className="app-frame state-screen" aria-busy="true">
        <span className="loading-flower" aria-hidden="true">
          🌼
        </span>
        <h1>問題をえらんでいます</h1>
        <p>ちょっとだけ待ってね</p>
      </main>
    );
  }

  if (contentState.status === "error") {
    return (
      <main className="app-frame state-screen">
        <span className="error-face" aria-hidden="true">
          …
        </span>
        <h1>うまく読み込めませんでした</h1>
        <p>{contentState.message}</p>
        <button type="button" className="start-button" onClick={contentState.retry}>
          もう一度ためす
        </button>
        <details>
          <summary>詳しい情報</summary>
          <code>{contentState.diagnostic}</code>
        </details>
      </main>
    );
  }

  if (selected) {
    if (questionLoading) {
      return (
        <main className="app-frame state-screen" aria-busy="true">
          <span className="loading-flower" aria-hidden="true">
            🌼
          </span>
          <h1>次の問題を準備中</h1>
        </main>
      );
    }
    if (questionError || !question) {
      return (
        <main className="app-frame state-screen">
          <span className="error-face" aria-hidden="true">
            …
          </span>
          <h1>この問題を開けませんでした</h1>
          <p>{questionError}</p>
          <button type="button" className="start-button" onClick={() => void open(selected)}>
            もう一度ためす
          </button>
          <button type="button" className="home-text-button" onClick={leavePlayer}>
            ホームへ戻る
          </button>
        </main>
      );
    }
    return (
      <Player
        key={`${question.id}:${question.revision}`}
        question={question}
        progress={progressRef.current}
        quickPosition={
          quickQueue ? { current: quickIndex + 1, total: quickQueue.length } : undefined
        }
        onBack={leavePlayer}
        onDone={finishQuestion}
      />
    );
  }

  if (screen === "complete" && quickQueue) {
    return (
      <SessionComplete
        questions={quickQueue}
        onAgain={() => startQuick("all")}
        onHome={leavePlayer}
      />
    );
  }

  if (screen === "library") {
    return (
      <Library
        content={contentState.content!}
        progress={progressRef.current}
        onOpen={(summary) => {
          setQuickQueue(undefined);
          void open(summary);
        }}
        onBack={() => setScreen("home")}
      />
    );
  }

  return (
    <Home
      content={contentState.content!}
      track={track}
      progress={progressRef.current}
      onTrackChange={changeTrack}
      onStart={startQuick}
      onLibrary={() => setScreen("library")}
    />
  );
}
