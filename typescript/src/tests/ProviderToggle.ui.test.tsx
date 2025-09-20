import React from 'react';
import { render, screen, within, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

// Mock electronAPI with deterministic mixed-provider data
const now = Date.now();
const mkTodos = (n: number) => Array.from({ length: n }, (_, i) => ({ content: `T${i+1}`, status: 'pending' }));

beforeAll(() => {
  (global as any).window = (global as any).window || {};
  (window as any).electronAPI = {
    async getProviderPresence() { return { claude: true, codex: true, gemini: true }; },
    async getProjects() {
      return {
        success: true,
        value: [
          { provider: 'claude', projectPath: '/proj-c', sessions: [{ provider: 'claude', sessionId: 'c1', todos: mkTodos(1), updatedAt: now - 1000 }] },
          { provider: 'codex', projectPath: '/proj-o', sessions: [{ provider: 'codex', sessionId: 'o1', todos: mkTodos(2), updatedAt: now - 900 }] },
          { provider: 'gemini', projectPath: '/proj-g', sessions: [{ provider: 'gemini', sessionId: 'g1', todos: mkTodos(1), updatedAt: now - 800 }] },
        ]
      };
    },
    onDataChanged: (cb: () => void) => cb,
  };
});

function getProjectItems() {
  return document.querySelectorAll('.project-item');
}
function getGlobalRows() {
  return document.querySelectorAll('.global-row');
}

test('title bar provider toggles affect Project and Global views', async () => {
  jest.useFakeTimers();
  render(<App />);

  // Allow splash to pass (~900ms)
  await act(async () => { jest.advanceTimersByTime(1000); });

  // Initial: all three providers visible
  // Ensure Project View visible by default and projects rendered
  await screen.findByText(/Projects \(/);
  expect(getProjectItems().length).toBe(3);

  // Switch to Global View and check rows (claude:1 + codex:1 + gemini:1 sessions)
  fireEvent.click(screen.getByRole('button', { name: /global view/i }));
  expect(getGlobalRows().length).toBe(3);

  // Toggle OpenAI (codex) off via icon
  const openAiBtn = screen.getByRole('button', { name: /show or hide openai/i });
  fireEvent.click(openAiBtn);

  // Back to Project View: expect 2 projects (claude + gemini)
  fireEvent.click(screen.getByRole('button', { name: /project view/i }));
  // Give effect time to refresh view models
  await act(async () => { jest.advanceTimersByTime(50); });
  expect(getProjectItems().length).toBe(2);

  // Global View: expect 2 rows
  fireEvent.click(screen.getByRole('button', { name: /global view/i }));
  await waitFor(() => expect(getGlobalRows().length).toBe(2), { timeout: 2000 });

  // Stop here: validated OpenAI toggle affects both views
});
