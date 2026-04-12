using System;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.VisualTree;
using Entropic.GUI.ViewModels;

namespace Entropic.GUI.Views;

public partial class ProjectView : UserControl
{
    private TodoItemViewModel? _draggedTodo;
    private Point _dragStart;
    private bool _isDragging;
    private const double DragThreshold = 8;

    public ProjectView()
    {
        InitializeComponent();
        AddHandler(PointerPressedEvent, OnTodoPointerPressed, RoutingStrategies.Tunnel);
        AddHandler(PointerMovedEvent, OnTodoPointerMoved, RoutingStrategies.Tunnel);
        AddHandler(PointerReleasedEvent, OnTodoPointerReleased, RoutingStrategies.Tunnel);
    }

    private void OnTodoPointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
        {
            // Check if we're clicking on a todo item
            if (e.Source is Visual visual)
            {
                var todoVm = FindTodoViewModel(visual);
                if (todoVm != null)
                {
                    _draggedTodo = todoVm;
                    _dragStart = e.GetPosition(this);
                    _isDragging = false;
                }
            }
        }
    }

    private void OnTodoPointerMoved(object? sender, PointerEventArgs e)
    {
        if (_draggedTodo == null) return;

        var pos = e.GetPosition(this);
        var delta = pos - _dragStart;
        if (!_isDragging && (Math.Abs(delta.X) > DragThreshold || Math.Abs(delta.Y) > DragThreshold))
        {
            _isDragging = true;
            Cursor = new Cursor(StandardCursorType.DragMove);
        }

        if (_isDragging && e.Source is Visual visual)
        {
            var targetTodo = FindTodoViewModel(visual);
            if (targetTodo != null && targetTodo != _draggedTodo)
            {
                // Perform the swap live as the user drags
                var vm = DataContext as ProjectsViewModel;
                if (vm?.SelectedSession != null)
                {
                    var todos = vm.SelectedSession.Todos;
                    var fromIdx = todos.IndexOf(_draggedTodo);
                    var toIdx = todos.IndexOf(targetTodo);
                    if (fromIdx >= 0 && toIdx >= 0 && fromIdx != toIdx)
                    {
                        todos.Move(fromIdx, toIdx);
                    }
                }
            }
        }
    }

    private void OnTodoPointerReleased(object? sender, PointerReleasedEventArgs e)
    {
        if (_draggedTodo != null && _isDragging)
        {
            _draggedTodo.PersistOwnerSession();
            Cursor = Cursor.Default;
        }
        _draggedTodo = null;
        _isDragging = false;
    }

    private static TodoItemViewModel? FindTodoViewModel(Visual? visual)
    {
        while (visual != null)
        {
            if (visual.DataContext is TodoItemViewModel todo)
                return todo;
            visual = visual.GetVisualParent();
        }
        return null;
    }
}
