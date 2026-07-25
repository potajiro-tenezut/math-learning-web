import { useMemo, useRef, useState } from "react";
import { Latex } from "./components/Latex";
import { ContentError } from "./data/contentRepository";
import type {
  AvailableContent,
  DifficultyLabel,
  ProgressStatus,
  PublicQuestion,
  QuestionSummary,
} from "./domain/content";
import {
  BrowserProgressRepository,
  type ProgressRepository,
} from "./domain/progress";
import { LearningSession } from "./domain/session";
import { useContent } from "./hooks/useContent";

const difficultyNames: Record<DifficultyLabel, string> = {
  intro: "入門",
  standard: "標準",
  challenge: "挑戦",
};

const statusNames: Record<ProgressStatus, string> = {
  "not-started": "未着手",
  "in-progress": "途中",
  completed: "完了",
};

function statusFor(summary: QuestionSummary, progress: ProgressRepository): ProgressStatus {
  return progress.get(summary.id, summary.revision)?.status ?? "not-started";
}

interface LibraryProps {
  content: AvailableContent;
  progress: ProgressRepository;
  onOpen: (summary: QuestionSummary) => void;
}

function Library({ content, progress, onOpen }: LibraryProps) {
  const [unit, setUnit] = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [tag, setTag] = useState("all");

  const units = useMemo(
    () =>
      Array.from(
        new Map(content.index.questions.map((question) => [question.unit.id, question.unit])).values(),
      ),
    [content],
  );
  const tags = useMemo(
    () => Array.from(new Set(content.index.questions.flatMap((question) => question.tags))).sort(),
    [content],
  );
  const filtered = content.index.questions.filter(
    (question) =>
      (unit === "all" || question.unit.id === unit) &&
      (difficulty === "all" || question.difficulty.label === difficulty) &&
      (tag === "all" || question.tags.includes(tag)),
  );
  const completedCount = content.index.questions.filter(
    (question) => statusFor(question, progress) === "completed",
  ).length;

  return (
    <>
      <header className="hero">
        <div>
          <p className="eyebrow">HANA MATH · STEP BY STEP</p>
          <h1>
            考える順番が、
            <br />
            数学をやさしくする。
          </h1>
          <p className="hero-copy">
            答えを急がず、次の一手を選びながら。
            <br />
            途中式の意味をひとつずつ身につけよう。
          </p>
        </div>
        <div className="progress-orbit" aria-label={`${completedCount}問完了`}>
          <span>{completedCount}</span>
          <small>/ {content.index.questionCount} 問</small>
          <strong>学習済み</strong>
        </div>
      </header>

      {content.usedFallback && (
        <aside className="notice" role="status">
          <span aria-hidden="true">↺</span>
          通信を確認できなかったため、前回正常に読み込んだ問題を表示しています。
        </aside>
      )}

      <section className="library" aria-labelledby="library-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">QUESTION LIBRARY</p>
            <h2 id="library-title">今日は、どこから始める？</h2>
          </div>
          <p className="version">コンテンツ {content.contentVersion}</p>
        </div>

        <div className="filters" aria-label="問題の絞り込み">
          <label>
            <span>単元</span>
            <select value={unit} onChange={(event) => setUnit(event.target.value)}>
              <option value="all">すべての単元</option>
              {units.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>むずかしさ</span>
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="all">すべて</option>
              {Object.entries(difficultyNames).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>タグ</span>
            <select value={tag} onChange={(event) => setTag(event.target.value)}>
              <option value="all">すべて</option>
              {tags.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="result-count" aria-live="polite">
          {filtered.length}問を表示
        </p>
        {filtered.length === 0 ? (
          <div className="empty">
            <span aria-hidden="true">◇</span>
            <h3>条件に合う問題がありません</h3>
            <p>絞り込みを変えて、別の問題を探してみましょう。</p>
          </div>
        ) : (
          <div className="question-grid">
            {filtered.map((question, index) => {
              const status = statusFor(question, progress);
              return (
                <button
                  type="button"
                  className="question-card"
                  key={`${question.id}:${question.revision}`}
                  onClick={() => onOpen(question)}
                >
                  <span className="card-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className={`status status-${status}`}>
                    <span aria-hidden="true">
                      {status === "completed" ? "✓" : status === "in-progress" ? "◐" : "○"}
                    </span>
                    {statusNames[status]}
                  </span>
                  <strong>{question.unit.name}</strong>
                  <span className="card-meta">
                    {difficultyNames[question.difficulty.label]} · レベル
                    {question.difficulty.score}
                  </span>
                  <span className="tag-row">
                    {question.tags.slice(0, 3).map((item) => (
                      <span key={item}>#{item}</span>
                    ))}
                  </span>
                  <span className="card-action">
                    問題をひらく <span aria-hidden="true">→</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

interface PlayerProps {
  question: PublicQuestion;
  progress: ProgressRepository;
  onBack: () => void;
}

function Player({ question, progress, onBack }: PlayerProps) {
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
  const state = session.state;
  const step = question.solutionSteps[state.stepIndex];

  const save = (status: "in-progress" | "completed", stepIndex: number) => {
    progress.save({
      questionId: question.id,
      revision: question.revision,
      status,
      stepIndex,
      updatedAt: new Date().toISOString(),
    });
  };

  const choose = (choiceId: string) => {
    session.select(choiceId);
    save("in-progress", session.state.stepIndex);
    render((value) => value + 1);
  };

  const next = () => {
    session.next();
    const nextState = session.state;
    save(nextState.phase === "completed" ? "completed" : "in-progress", nextState.stepIndex);
    render((value) => value + 1);
  };

  const restart = () => {
    progress.remove(question.id, question.revision);
    setSession(new LearningSession(question));
  };

  return (
    <main className="player-shell">
      <nav className="player-nav" aria-label="問題ナビゲーション">
        <button type="button" className="text-button" onClick={onBack}>
          <span aria-hidden="true">←</span> 問題一覧
        </button>
        <span>{question.unit.name}</span>
        <button type="button" className="text-button" onClick={restart}>
          最初から
        </button>
      </nav>

      <article className="player">
        <div className="player-meta">
          <span>{difficultyNames[question.difficulty.label]}</span>
          <span>
            {state.phase === "completed"
              ? "完了"
              : `STEP ${state.stepIndex + 1} / ${question.solutionSteps.length}`}
          </span>
        </div>
        <h1>{question.problemText}</h1>
        {question.problemLatex && (
          <div className="problem-math">
            <Latex value={question.problemLatex} block />
          </div>
        )}

        {state.phase === "completed" ? (
          <section className="completion" aria-live="polite">
            <span className="completion-mark" aria-hidden="true">
              ✓
            </span>
            <p className="eyebrow">WELL DONE</p>
            <h2>最後まで解けました</h2>
            <div className="answer-box">
              <span>答え</span>
              <Latex value={question.answer.finalAnswerLatex} block />
            </div>
            <div className="plan">
              <h3>解き方のまとめ</h3>
              <p>{question.solutionPlan.summary}</p>
            </div>
            <div className="completion-actions">
              <button type="button" className="primary-button" onClick={onBack}>
                ほかの問題へ
              </button>
              <button type="button" className="secondary-button" onClick={restart}>
                もう一度解く
              </button>
            </div>
          </section>
        ) : (
          <section className="step-panel" aria-labelledby="step-question">
            <div className="step-progress" aria-hidden="true">
              {question.solutionSteps.map((item, index) => (
                <span
                  key={item.stepId}
                  className={index <= state.stepIndex ? "active" : undefined}
                />
              ))}
            </div>
            <p className="current-expression">いまの式</p>
            <div className="step-math">
              <Latex value={step.beforeLatex} block />
            </div>
            <h2 id="step-question">次に、どの操作をする？</h2>
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
                    onClick={() => choose(choice.id)}
                  >
                    <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
                    <span>
                      <strong>{choice.text}</strong>
                      {choice.latex && <Latex value={choice.latex} />}
                    </span>
                    {selected && (
                      <span aria-hidden="true">{state.phase === "correct" ? "✓" : "×"}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {state.feedback && (
              <div
                className={`feedback ${state.phase === "correct" ? "feedback-correct" : "feedback-wrong"}`}
                role="status"
                aria-live="polite"
              >
                <strong>{state.phase === "correct" ? "その通り！" : "もう一度考えてみよう"}</strong>
                <p>{state.feedback}</p>
                {state.phase === "correct" && (
                  <>
                    <div className="result-math">
                      <span>すると</span>
                      <Latex value={step.afterLatex} block />
                    </div>
                    <button type="button" className="primary-button" onClick={next} autoFocus>
                      {state.stepIndex === question.solutionSteps.length - 1
                        ? "答えを確認する"
                        : "次のステップへ"}{" "}
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

export default function App() {
  const contentState = useContent();
  const progressRef = useRef<ProgressRepository | null>(null);
  if (!progressRef.current) progressRef.current = new BrowserProgressRepository();
  const [selected, setSelected] = useState<QuestionSummary>();
  const [question, setQuestion] = useState<PublicQuestion>();
  const [questionError, setQuestionError] = useState<string>();
  const [questionLoading, setQuestionLoading] = useState(false);

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

  if (contentState.status === "loading") {
    return (
      <main className="state-screen" aria-busy="true">
        <div className="loader" />
        <p className="eyebrow">PREPARING YOUR LESSON</p>
        <h1>問題を準備しています</h1>
        <p>安全に読み込めるか、ひとつずつ確認中です。</p>
      </main>
    );
  }

  if (contentState.status === "error") {
    return (
      <main className="state-screen">
        <span className="state-icon" aria-hidden="true">
          !
        </span>
        <h1>問題を読み込めませんでした</h1>
        <p>{contentState.message}</p>
        <button type="button" className="primary-button" onClick={contentState.retry}>
          もう一度試す
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
        <main className="state-screen" aria-busy="true">
          <div className="loader" />
          <h1>問題を読み込んでいます</h1>
        </main>
      );
    }
    if (questionError || !question) {
      return (
        <main className="state-screen">
          <span className="state-icon" aria-hidden="true">
            !
          </span>
          <h1>この問題を開けませんでした</h1>
          <p>{questionError}</p>
          <div className="state-actions">
            <button type="button" className="primary-button" onClick={() => void open(selected)}>
              もう一度試す
            </button>
            <button type="button" className="secondary-button" onClick={() => setSelected(undefined)}>
              一覧に戻る
            </button>
          </div>
        </main>
      );
    }
    return (
      <Player
        question={question}
        progress={progressRef.current}
        onBack={() => {
          setSelected(undefined);
          setQuestion(undefined);
        }}
      />
    );
  }

  return (
    <main className="site-shell">
      <Library
        content={contentState.content!}
        progress={progressRef.current}
        onOpen={(summary) => void open(summary)}
      />
      <footer>
        <span>花まる数学</span>
        <p>一歩ずつ、自分のペースで。</p>
      </footer>
    </main>
  );
}
