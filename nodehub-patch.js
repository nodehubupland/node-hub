// Node Hub V1 patch loader
(function () {
    const style = document.createElement("style");
    style.textContent = `
        @media (max-width: 760px) {
            #map .map-preview { min-height: 560px; }
            #map .node-map-content { grid-template-columns: 1fr !important; }
            #map #node-map-list { max-height: 230px !important; }
            #map .node-map-live { padding: 18px !important; }
        }
        #node-upland-url { display: none !important; }
        label[for="node-upland-url"], #node-upland-url + small { display: none !important; }
    `;
    document.head.appendChild(style);

    // V1 database compatibility: the current nodes table does not contain
    // upland_node_url. Intercept the registration form before app.js submits it
    // and write only columns confirmed to exist in the current V1 schema.
    document.addEventListener("submit", async function (event) {
        const form = event.target;
        if (!form || form.id !== "node-registration-form") return;

        event.preventDefault();
        event.stopImmediatePropagation();

        if (!currentUser) {
            window.location.hash = "login";
            return;
        }

        const name = getValue("node-name");
        const description = getValue("node-description");
        const city = getValue("node-city");
        const country = getValue("node-country");
        const uplandLocation = getValue("node-upland-location");
        const continent = getValue("node-continent");
        const discord = getValue("node-discord");
        const twitter = getValue("node-twitter");
        const telegram = getValue("node-telegram");
        const imageFile = document.getElementById("node-logo")?.files?.[0] || null;
        const button = form.querySelector("button[type='submit']");

        if (!name || !city || !country || !continent) {
            alert("Please complete Node Name, City, Country and Continent.");
            return;
        }

        const originalText = button?.textContent || "Submit Node for Review";
        if (button) {
            button.disabled = true;
            button.textContent = "Submitting...";
        }

        try {
            let logoURL = null;

            if (imageFile) {
                if (!imageFile.type.startsWith("image/") || imageFile.size > 5 * 1024 * 1024) {
                    alert("Please select an image smaller than 5 MB.");
                    return;
                }

                const extension = getFileExtension(imageFile.name);
                const fileName = `${currentUser.id}/${Date.now()}-${randomString(8)}.${extension}`;
                const { error: uploadError } = await db.storage
                    .from("node-images")
                    .upload(fileName, imageFile, {
                        cacheControl: "3600",
                        upsert: false,
                        contentType: imageFile.type
                    });

                if (uploadError) {
                    alert("Could not upload the Node image: " + uploadError.message);
                    return;
                }

                logoURL = db.storage.from("node-images").getPublicUrl(fileName).data.publicUrl;
            }

            const payload = {
                user_id: currentUser.id,
                name,
                description: description || null,
                city,
                country,
                upland_location: uplandLocation || null,
                continent,
                logo_url: logoURL,
                discord_url: discord || null,
                twitter_url: twitter || null,
                telegram_url: telegram || null,
                status: "pending"
            };

            const { error } = await db.from("nodes").insert(payload);

            if (error) {
                console.error("Node registration error:", error);
                alert("Could not register the Node: " + error.message);
                return;
            }

            alert("Node submitted successfully! It will be reviewed by the Node Hub team.");
            clearNodeForm();
            await loadMyNodes();
            window.location.hash = "dashboard";
        } catch (error) {
            console.error("Node registration exception:", error);
            alert("Unable to submit the Node. Please try again.");
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = originalText;
            }
        }
    }, true);

    document.addEventListener("DOMContentLoaded", function () {
        const uplandLabel = document.querySelector('label[for="node-upland-url"]');
        const uplandInput = document.getElementById("node-upland-url");
        const uplandHelp = uplandInput?.nextElementSibling;
        if (uplandLabel) uplandLabel.remove();
        if (uplandInput) uplandInput.remove();
        if (uplandHelp?.tagName === "SMALL") uplandHelp.remove();
    });

    const script = document.createElement("script");
    script.src = "directory-navigation.js?v=20260824";
    script.async = false;
    document.body.appendChild(script);
})();
