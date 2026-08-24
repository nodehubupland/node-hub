// =====================================================
// NODE HUB
// Public Node profile navigation
// =====================================================

// The directory cards are created dynamically by app.js.
// This delegated listener makes approved Node cards open
// their public profile without changing the existing card
// rendering or Supabase logic.

document.addEventListener("click", event => {

    const link = event.target.closest("a");

    // Keep Discord, Telegram and X/Twitter links working normally.
    if (link) {
        return;
    }

    const card = event.target.closest(".node-card");

    if (!card) {
        return;
    }

    // Do not interfere with dashboard Node cards.
    if (!card.closest("#node-grid")) {
        return;
    }

    const nodeName = card.querySelector("h3")?.textContent?.trim();

    if (!nodeName || !Array.isArray(window.nodes)) {
        return;
    }

    const node = window.nodes.find(
        item => (item.name || "").trim() === nodeName
    );

    if (!node?.id) {
        return;
    }

    window.location.href = `node.html?id=${encodeURIComponent(node.id)}`;

});
