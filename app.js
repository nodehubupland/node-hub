// =============================================
// NODE HUB
// Supabase + Frontend
// =============================================

const SUPABASE_URL =
    "https://ynqtzyzxspoxssjrjeve.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_FoDbr9qgVeeIYfzEZNNN9Q_53aHxI2g";


// =============================================
// SUPABASE CLIENT
// =============================================

const { createClient } = supabase;

const db = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =============================================
// STATE
// =============================================

let nodes = [];


// =============================================
// DOM
// =============================================

const nodeGrid =
    document.getElementById("node-grid");

const nodeCount =
    document.getElementById("node-count");

const searchInput =
    document.getElementById("node-search");

const continentFilter =
    document.getElementById("continent-filter");


// =============================================
// INITIALIZE
// =============================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadNodes();

        setupSearch();

        setupLanguage();

    }
);


// =============================================
// LOAD NODES
// =============================================

async function loadNodes() {

    try {

        const {
            data,
            error
        } = await db
            .from("nodes")
            .select("*")
            .eq("status", "approved")
            .order("created_at", {
                ascending: false
            });


        if (error) {

            console.error(
                "Error loading Nodes:",
                error
            );

            showEmptyDirectory();

            return;

        }


        nodes = data || [];

        renderNodes(nodes);

    }

    catch (error) {

        console.error(
            "Unexpected error:",
            error
        );

        showEmptyDirectory();

    }

}


// =============================================
// RENDER NODES
// =============================================

function renderNodes(list) {

    nodeGrid.innerHTML = "";


    nodeCount.textContent =
        `${list.length} ${list.length === 1 ? "Node" : "Nodes"}`;


    if (!list.length) {

        showEmptyDirectory();

        return;

    }


    list.forEach(node => {

        const card =
            createNodeCard(node);

        nodeGrid.appendChild(card);

    });

}


// =============================================
// NODE CARD
// =============================================

function createNodeCard(node) {

    const article =
        document.createElement("article");


    article.className =
        "node-card";


    const logo =
        node.logo_url ||
        "";


    const imageHTML = logo

        ? `
            <div class="node-card-image">

                <img
                    src="${escapeHTML(logo)}"
                    alt="${escapeHTML(node.name || "Node")}"
                    loading="lazy"
                >

            </div>
        `

        : `
            <div class="node-card-image node-card-placeholder">
                ●
            </div>
        `;


    article.innerHTML = `

        ${imageHTML}


        <div class="node-card-content">

            <h3>
                ${escapeHTML(
                    node.name || "Unnamed Node"
                )}
            </h3>


            <p class="node-location">

                ${escapeHTML(
                    node.city || ""
                )}

                ${
                    node.country
                        ? `, ${escapeHTML(node.country)}`
                        : ""
                }

            </p>


            ${
                node.description

                    ? `
                        <p class="node-description">

                            ${escapeHTML(
                                node.description
                            )}

                        </p>
                    `

                    : ""
            }


            <div class="node-links">

                ${
                    node.discord_url

                        ? `
                            <a
                                href="${safeURL(node.discord_url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Discord
                            </a>
                        `

                        : ""
                }


                ${
                    node.telegram_url

                        ? `
                            <a
                                href="${safeURL(node.telegram_url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Telegram
                            </a>
                        `

                        : ""
                }


                ${
                    node.twitter_url

                        ? `
                            <a
                                href="${safeURL(node.twitter_url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                X / Twitter
                            </a>
                        `

                        : ""
                }

            </div>


            <div class="node-card-footer">

                <span class="verified-badge">
                    Verified Node
                </span>

            </div>

        </div>

    `;


    return article;

}


// =============================================
// EMPTY DIRECTORY
// =============================================

function showEmptyDirectory() {

    nodeGrid.innerHTML = `

        <div class="empty-directory">

            <div class="empty-icon">
                ◉
            </div>


            <h3>
                No Nodes listed yet
            </h3>


            <p>
                Be one of the first Node
                administrators to register
                your Node.
            </p>


            <a
                href="#submit"
                class="button button-primary"
            >
                Submit a Node
            </a>

        </div>

    `;


    nodeCount.textContent =
        "0 Nodes";

}


// =============================================
// SEARCH
// =============================================

function setupSearch() {

    if (!searchInput) {
        return;
    }


    searchInput.addEventListener(
        "input",
        filterNodes
    );


    if (continentFilter) {

        continentFilter.addEventListener(
            "change",
            filterNodes
        );

    }

}


// =============================================
// FILTER
// =============================================

function filterNodes() {

    const search =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    const continent =
        continentFilter
            ? continentFilter.value
            : "";


    const filtered =
        nodes.filter(node => {

            const text = [

                node.name,

                node.city,

                node.country,

                node.description

            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();


            const matchesSearch =
                !search ||
                text.includes(search);


            const matchesContinent =
                !continent ||
                node.continent === continent;


            return (
                matchesSearch &&
                matchesContinent
            );

        });


    renderNodes(filtered);

}


// =============================================
// LANGUAGE
// =============================================

function setupLanguage() {

    const selector =
        document.getElementById(
            "language-selector"
        );


    if (!selector) {
        return;
    }


    selector.addEventListener(
        "change",
        () => {

            const language =
                selector.value;


            localStorage.setItem(
                "nodehub-language",
                language
            );


            if (language === "pt-BR") {

                alert(
                    "Português (BR) será ativado na próxima etapa do projeto."
                );

            }

        }
    );


    const savedLanguage =
        localStorage.getItem(
            "nodehub-language"
        );


    if (savedLanguage) {

        selector.value =
            savedLanguage;

    }

}


// =============================================
// SECURITY HELPERS
// =============================================

function escapeHTML(value) {

    if (value === null ||
        value === undefined) {

        return "";

    }


    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// =============================================
// URL VALIDATION
// =============================================

function safeURL(url) {

    try {

        const parsed =
            new URL(url);


        if (
            parsed.protocol === "https:" ||
            parsed.protocol === "http:"
        ) {

            return escapeHTML(
                parsed.href
            );

        }

    }

    catch (error) {

        console.warn(
            "Invalid URL:",
            url
        );

    }


    return "#";

}
