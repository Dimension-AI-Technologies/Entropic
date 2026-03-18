import type { Session } from '../../models/Todo';

export function calculateMergePreview(sources: Session[], target: Session) {
  let totalNewTodos = 0;
  let totalDuplicates = 0;
  const steps: Array<{ source: string; target: string; todos: number }> = [];

  const targetContents = new Set(target.todos.map((t) => t.content.toLowerCase()));
  const mergedContents = new Set(targetContents);

  for (const source of sources) {
    let stepNewTodos = 0;
    let stepDuplicates = 0;
    for (const todo of source.todos) {
      const lowerContent = todo.content.toLowerCase();
      if (mergedContents.has(lowerContent)) stepDuplicates++;
      else {
        stepNewTodos++;
        mergedContents.add(lowerContent);
      }
    }
    totalNewTodos += stepNewTodos;
    totalDuplicates += stepDuplicates;
    steps.push({ source: source.id.substring(0, 8), target: target.id.substring(0, 8), todos: stepNewTodos });
  }

  return {
    totalTodos: target.todos.length + totalNewTodos,
    duplicates: totalDuplicates,
    newTodos: totalNewTodos,
    steps,
  };
}

