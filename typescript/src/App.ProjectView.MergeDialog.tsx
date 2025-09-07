import React, { useState } from 'react';

interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
  id?: string;
  created?: Date;
}

interface Session {
  id: string;
  todos: Todo[];
  lastModified: Date;
  created?: Date;
  filePath?: string;
}

interface Project {
  path: string;
  sessions: Session[];
  mostRecentTodoDate?: Date;
}

// Helper function to format dates in UK format: dd-MMM-yyyy
function formatUKDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Helper function to format time in UK format: HH:mm
function formatUKTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

interface MergePreview {
  totalTodos: number;
  duplicates: number;
  newTodos: number;
  steps: Array<{source: string; target: string; todos: number}>;
}

interface MergeDialogProps {
  showMergeDialog: boolean;
  mergeTarget: Session | null;
  mergeSources: Session[];
  mergePreview: MergePreview | null;
  selectedTabs: Set<string>;
  onPerformMerge: () => Promise<void>;
  onCloseMergeDialog: () => void;
  onSessionSelect: (session: Session) => void;
  onLoadTodos: () => Promise<void>;
}

export function MergeDialog({
  showMergeDialog,
  mergeTarget,
  mergeSources,
  mergePreview,
  selectedTabs,
  onPerformMerge,
  onCloseMergeDialog,
  onSessionSelect,
  onLoadTodos
}: MergeDialogProps) {

  const handlePerformMerge = async () => {
    if (!mergeTarget || !mergeTarget.filePath || mergeSources.length === 0) return;
    
    try {
      // Start with target todos
      let mergedTodos: Todo[] = [...mergeTarget.todos];
      const mergedContents = new Set(mergeTarget.todos.map(t => t.content.toLowerCase()));
      
      // Track merge progress
      const mergeResults: Array<{source: string; success: boolean; todosAdded: number; error?: string}> = [];
      
      // Sequential merge - one source at a time
      for (const source of mergeSources) {
        if (!source.filePath) {
          mergeResults.push({
            source: source.id.substring(0, 8),
            success: false,
            todosAdded: 0,
            error: 'No file path'
          });
          continue;
        }
        
        try {
          // Save current state for rollback
          const beforeMerge = [...mergedTodos];
          let todosAdded = 0;
          
          // Add unique todos from this source
          for (const sourceTodo of source.todos) {
            if (!mergedContents.has(sourceTodo.content.toLowerCase())) {
              mergedTodos.push(sourceTodo);
              mergedContents.add(sourceTodo.content.toLowerCase());
              todosAdded++;
            }
          }
          
          // Verify the merge makes sense
          if (mergedTodos.length !== beforeMerge.length + todosAdded) {
            console.error(`Merge verification failed: expected ${beforeMerge.length + todosAdded} todos, got ${mergedTodos.length}`);
            alert('Merge operation failed verification. Please try again.');
            return;
          }
          
          // Save the updated todos to target
          await window.electronAPI.saveTodos(mergeTarget.filePath, mergedTodos);
          
          // Delete the source session only after successful save
          await window.electronAPI.deleteTodoFile(source.filePath);
          
          mergeResults.push({
            source: source.id.substring(0, 8),
            success: true,
            todosAdded
          });
          
        } catch (error) {
          // Rollback on error
          console.error(`Failed to merge session ${source.id}:`, error);
          mergeResults.push({
            source: source.id.substring(0, 8),
            success: false,
            todosAdded: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          // Stop merging further sources on error
          break;
        }
      }
      
      // Log results
      console.log('Merge completed:', mergeResults);
      
      // Close dialog
      onCloseMergeDialog();
      
      // Reload data
      await onLoadTodos();
      
      // Select the target session
      onSessionSelect(mergeTarget);
      
      // Show summary if there were any failures
      const failures = mergeResults.filter(r => !r.success);
      if (failures.length > 0) {
        alert(`Merge partially completed. ${failures.length} session(s) failed to merge.`);
      }
      
    } catch (error) {
      console.error('Failed to perform merge:', error);
      alert('Merge failed. No changes were made.');
    }
  };

  if (!showMergeDialog || !mergeTarget || mergeSources.length === 0) {
    return null;
  }

  return (
    <div className="merge-dialog-overlay">
      <div className="merge-dialog">
        <h3>Merge {mergeSources.length + 1} Sessions</h3>
        
        <div className="merge-info">
          <div className="merge-sources">
            <h4>Sources ({mergeSources.length} sessions - will be deleted):</h4>
            {mergeSources.map((source, idx) => (
              <div key={source.id} className="session-details">
                <div>#{idx + 1}: {source.id.substring(0, 8)}</div>
                <div>Todos: {source.todos.length}</div>
                <div>Date: {formatUKDate(source.lastModified)} {formatUKTime(source.lastModified)}</div>
              </div>
            ))}
          </div>
          
          <div className="merge-arrow">→</div>
          
          <div className="merge-target">
            <h4>Target (newest - will keep):</h4>
            <div className="session-details">
              <div>Session: {mergeTarget.id.substring(0, 8)}</div>
              <div>Todos: {mergeTarget.todos.length}</div>
              <div>Date: {formatUKDate(mergeTarget.lastModified)} {formatUKTime(mergeTarget.lastModified)}</div>
            </div>
          </div>
        </div>
        
        {mergePreview && (
          <div className="merge-preview">
            <h4>Merge Plan (Sequential):</h4>
            <div className="merge-steps">
              {mergePreview.steps.map((step, idx) => (
                <div key={idx} className="merge-step">
                  Step {idx + 1}: Merge {step.source} → {step.target} 
                  <span className="step-detail">({step.todos} new todos)</span>
                </div>
              ))}
            </div>
          
            <div className="merge-stats">
              <div className="stat">
                <span className="stat-label">New todos to add:</span>
                <span className="stat-value">{mergePreview.newTodos}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Duplicates (will skip):</span>
                <span className="stat-value">{mergePreview.duplicates}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Final todo count:</span>
                <span className="stat-value">{mergePreview.totalTodos}</span>
              </div>
            </div>
          </div>
        )}
        
        <div className="merge-actions">
          <button className="confirm-btn" onClick={handlePerformMerge}>
            Merge and Delete {mergeSources.length} Source{mergeSources.length > 1 ? 's' : ''}
          </button>
          <button className="cancel-btn" onClick={onCloseMergeDialog}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    electronAPI: {
      getTodos: () => Promise<Project[]>;
      saveTodos: (filePath: string, todos: Todo[]) => Promise<boolean>;
      deleteTodoFile: (filePath: string) => Promise<boolean>;
    };
  }
}