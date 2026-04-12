namespace Entropic.GUI.Controls.Chat;

public interface IChatTabNavigation
{
    bool IsFollowMode { get; set; }
    void ScrollToTop();
    void ScrollToEnd();
    void PageUp();
    void PageDown();
    void NavBubble(int direction);
    void NavUserPrompt(int direction);
    void SyncFollowIfNeeded();
}
