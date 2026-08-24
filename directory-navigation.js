// =====================================================
// NODE HUB
// Public Node profile navigation
// Upland Node link registration support
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


// =====================================================
// UPLAND NODE LINK REGISTRATION
// =====================================================

function setupUplandNodeLink() {

    const form =
        document.getElementById("node-registration-form");

    if (!form) {
        return;
    }

    if (document.getElementById("node-upland-link")) {
        return;
    }

    const uplandLocation =
        document.getElementById("node-upland-location");

    if (!uplandLocation) {
        return;
    }

    const label = document.createElement("label");
    label.setAttribute("for", "node-upland-link");
    label.textContent = "Upland Node Link";

    const input = document.createElement("input");
    input.type = "url";
    input.id = "node-upland-link";
    input.placeholder = "https://play.upland.me/...";
    input.autocomplete = "url";

    const small = document.createElement("small");
    small.textContent =
        "Paste the direct Upland link to your Node. This helps us identify the exact location.";

    uplandLocation.insertAdjacentElement("afterend", small);
    small.insertAdjacentElement("afterend", label);
    label.insertAdjacentElement("afterend", input);
}


// =====================================================
// SUBMIT WITH UPLAND NODE LINK
// =====================================================

function setupUplandNodeSubmit() {

    const form =
        document.getElementById("node-registration-form");

    if (!form || form.dataset.uplandLinkHandler === "true") {
        return;
    }

    form.dataset.uplandLinkHandler = "true";

    // Capture phase runs before the original app.js submit handler.
    form.addEventListener("submit", async event => {

        event.preventDefault();
        event.stopImmediatePropagation();

        if (!window.currentUser && typeof currentUser === "undefined") {
            alert("You must be signed in to register a Node.");
            window.location.hash = "login";
            return;
        }

        const user =
            typeof currentUser !== "undefined"
                ? currentUser
                : window.currentUser;

        if (!user) {
            alert("You must be signed in to register a Node.");
            window.location.hash = "login";
            return;
        }

        const get = id =>
            document.getElementById(id)?.value.trim() || "";

        const name = get("node-name");
        const description = get("node-description");
        const city = get("node-city");
        const country = get("node-country");
        const uplandLocation = get("node-upland-location");
        const uplandNodeLink = get("node-upland-link");
        const continent = get("node-continent");
        const discord = get("node-discord");
        const twitter = get("node-twitter");
        const telegram = get("node-telegram");

        if (!name || !city || !country || !continent) {
            alert("Please complete Node Name, City, Country and Continent.");
            return;
        }

        if (uplandNodeLink) {
            try {
                const parsed = new URL(uplandNodeLink);

                if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
                    throw new Error("Invalid protocol");
                }
            } catch (error) {
                alert("Please enter a valid Upland Node link.");
                return;
            }
        }

        const imageInput =
            document.getElementById("node-logo");

        const imageFile =
            imageInput?.files?.[0] || null;

        try {

            let logoURL = null;

            if (imageFile) {

                if (!imageFile.type.startsWith("image/")) {
                    alert("Please select a valid image.");
                    return;
                }

                if (imageFile.size > 5 * 1024 * 1024) {
                    alert("The image must be smaller than 5 MB.");
                    return;
                }

                const extension =
                    imageFile.name.includes(".")
                        ? imageFile.name.split(".").pop().toLowerCase()
                        : "jpg";

                const fileName =
                    `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

                const { error: uploadError } =
                    await db.storage
                        .from("node-images")
                        .upload(fileName, imageFile, {
                            cacheControl: "3600",
                            upsert: false,
                            contentType: imageFile.type
                        });

                if (uploadError) {
                    console.error("Image upload error:", uploadError);
                    alert("Could not upload the Node image: " + uploadError.message);
                    return;
                }

                const { data: publicURLData } =
                    db.storage
                        .from("node-images")
                        .getPublicUrl(fileName);

                logoURL = publicURLData.publicUrl;
            }

            const nodeData = {
                user_id: user.id,
                name,
                description: description || null,
                city,
                country,
                upland_location: uplandLocation || null,
                upland_node_url: uplandNodeLink || null,
                continent,
                logo_url: logoURL,
                discord_url: discord || null,
                twitter_url: twitter || null,
                telegram_url: telegram || null,
                status: "pending"
            };

            const { data, error } =
                await db
                    .from("nodes")
                    .insert(nodeData)
                    .select()
                    .single();

            if (error) {
                console.error("Node insert error:", error);
                alert("Could not register the Node: " + error.message);
                return;
            }

            console.log("Node created:", data);

            alert(
                "Node submitted successfully! It will be reviewed by the Node Hub team."
            );

            form.reset();

            const preview =
                document.getElementById("node-image-preview");

            if (preview) {
                preview.innerHTML = "";
            }

            if (typeof loadMyNodes === "function") {
                await loadMyNodes();
            }

            window.location.hash = "dashboard";

        } catch (error) {
            console.error("Unexpected Node registration error:", error);
            alert("Unable to submit the Node.");
        }

    }, true);
}


// =====================================================
// INITIALIZE
// =====================================================

function initializeUplandNodeLinkFeature() {

    setupUplandNodeLink();
    setupUplandNodeSubmit();

    // The dashboard form is created dynamically by app.js.
    // Watch for it and initialize the feature immediately when it appears.
    const observer = new MutationObserver(() => {

        const form =
            document.getElementById("node-registration-form");

        if (form) {
            setupUplandNodeLink();
            setupUplandNodeSubmit();
        }

    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

document.addEventListener("DOMContentLoaded", initializeUplandNodeLinkFeature);
