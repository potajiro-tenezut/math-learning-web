export function pickRandomQuestions<T>(
  questions: readonly T[],
  count: number,
  random: () => number = Math.random,
  isPreferred: (question: T) => boolean = () => true,
): T[] {
  const shuffle = (items: T[]) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  };

  const preferred = shuffle(questions.filter(isPreferred));
  const remaining = shuffle(questions.filter((question) => !isPreferred(question)));
  return [...preferred, ...remaining].slice(0, Math.max(0, count));
}
