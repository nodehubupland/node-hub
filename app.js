/* =========================================
   NODE HUB
   V1.0 APPLICATION
========================================= */

"use strict";


/* =========================================
   DEMO NODE DATA
=========================================

   These are temporary demonstration records.

   IMPORTANT:
   They are NOT official Upland Nodes.

   Real Nodes will eventually come from the
   Node Hub database after administrator approval.
========================================= */

const demoNodes = [
    {
        id: 1,
        name: "Example Node",
        city: "Chicago",
        country: "United States",
        continent: "North America",
        neighborhood: "Coming Soon",
        leader: "Node Administrator",
        verified: false,
        discord: "",
        telegram: "",
        twitter: "",
        instagram: "",
        youtube: "",
        logo: ""
    }
];


/* =========================================
   APPLICATION STATE
========================================= */

const state = {
    language: "en-US",
    search: "",
    continent: ""
};


/* =========================================
   DOM ELEMENTS
========================================= */

const nodeGrid =
    document.getElementById("node-grid");

const nodeCount =
    document.getElementById("node-count");

const nodeSearch =
    document.getElementById("node-search");

const continentFilter =
    document.getElementById("continent-filter");

const languageSelector =
    document.getElementById("language-selector");


/* =========================================
   TRANSLATIONS
========================================= */

const translations = {

    "en-US": {

        nodes: "Nodes",

        noNodes: "No Nodes listed yet",

        noNodesDescription:
            "Be one of the first Node administrators to register your Node.",

        submitNode:
            "Submit a Node",

        searchPlaceholder:
            "Search Node, city or country",

        allContinents:
            "All continents",

        verified:
            "Verified",

        pending:
            "Pending",

        location:
            "Location",

        leader:
            "Leader",

        visitDiscord:
            "Visit Discord",

        viewNode:
            "View Node",

        demoNotice:
            "Demo Node"

    },


    "pt-BR": {

        nodes: "Nodes",

        noNodes:
            "Nenhum Node cadastrado ainda",

        noNodesDescription:
            "Seja um dos primeiros administradores a cadastrar seu Node.",

        submitNode:
            "Cadastrar um Node",

        searchPlaceholder:
            "Pesquisar Node, cidade ou país",

        allContinents:
            "Todos os continentes",

        verified:
            "Verificado",

        pending:
            "Pendente",

        location:
            "Localização",

        leader:
            "Líder",

        visitDiscord:
            "Visitar Discord",

        viewNode:
            "Ver Node",

        demoNotice:
            "Node de demonstração"

    }

};


/* =========================================
   GET TRANSLATION
========================================= */

function t(key) {

    const language =
        translations[state.language]
        || translations["en-US"];

    return language[key]
        || translations["en-US"][key]
        || key;
}


/* =========================================
   ESCAPE HTML
=========================================

   Prevents user-provided information from
   being interpreted as HTML when Nodes are
   eventually loaded from the database.
========================================= */

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================
   FILTER NODES
========================================= */

function getFilteredNodes() {

    const search =
        state.search
            .trim()
            .toLowerCase();

    return demoNodes.filter(node => {

        const matchesSearch =
            !search
            ||
            node.name
                .toLowerCase()
                .includes(search)
            ||
            node.city
                .toLowerCase()
                .includes(search)
            ||
            node.country
                .toLowerCase()
                .includes(search)
            ||
            node.neighborhood
                .toLowerCase()
                .includes(search);


        const matchesContinent =
            !state.continent
            ||
            node.continent ===
            state.continent;


        return (
            matchesSearch &&
            matchesContinent
        );

    });

}


/* =========================================
   RENDER NODE
========================================= */

function renderNode(node) {

    const verifiedBadge =
        node.verified
            ? `
                <span class="node-badge verified">
                    ✓ ${t("verified")}
                </span>
            `
            : `
                <span class="node-badge pending">
                    ${t("pending")}
                </span>
            `;


    const logo =
        node.logo
            ? `
                <img
                    src="${escapeHTML(node.logo)}"
                    alt="${escapeHTML(node.name)} logo"
                    class="node-logo-image"
                >
            `
            : `
                <div class="node-logo-placeholder">
                    ●
                </div>
            `;


    const discordButton =
        node.discord
            ? `
                <a
                    href="${escapeHTML(node.discord)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="node-link"
                >
                    ${t("visitDiscord")}
                </a>
            `
            : "";


    return `

        <article class="node-card">

            <div class="node-card-header">

                ${logo}

                <div class="node-card-title">

                    <h3>
                        ${escapeHTML(node.name)}
                    </h3>

                    ${verifiedBadge}

                </div>

            </div>


            <div class="node-card-info">

                <div>

                    <small>
                        ${t("location")}
                    </small>

                    <strong>
                        ${escapeHTML(node.city)},
                        ${escapeHTML(node.country)}
                    </strong>

                </div>


                <div>

                    <small>
                        ${t("leader")}
                    </small>

                    <strong>
                        ${escapeHTML(node.leader)}
                    </strong>

                </div>

            </div>


            <div class="node-card-footer">

                ${discordButton}

                <button
                    type="button"
                    class="node-link node-view-button"
                    data-node-id="${node.id}"
                >
                    ${t("viewNode")}
                </button>

            </div>

        </article>

    `;

}


/* =========================================
   RENDER DIRECTORY
========================================= */

function renderNodes() {

    if (!nodeGrid) {
        return;
    }


    const filteredNodes =
        getFilteredNodes();


    if (nodeCount) {

        nodeCount.textContent =
            `${filteredNodes.length} ${t("nodes")}`;

    }


    if (!filteredNodes.length) {

        nodeGrid.innerHTML = `

            <div class="empty-directory">

                <div class="empty-icon">
                    ◉
                </div>

                <h3>
                    ${t("noNodes")}
                </h3>

                <p>
                    ${t("noNodesDescription")}
                </p>

                <a
                    href="#submit"
                    class="button button-primary"
                >
                    ${t("submitNode")}
                </a>

            </div>

        `;

        return;

    }


    nodeGrid.innerHTML =
        filteredNodes
            .map(renderNode)
            .join("");


    attachNodeButtons();

}


/* =========================================
   NODE BUTTONS
========================================= */

function attachNodeButtons() {

    const buttons =
        document.querySelectorAll(
            ".node-view-button"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const nodeId =
                    Number(
                        button.dataset.nodeId
                    );

                const node =
                    demoNodes.find(
                        item =>
                            item.id === nodeId
                    );


                if (!node) {
                    return;
                }


                alert(
                    `${node.name}\n\n` +
                    `${t("location")}: ` +
                    `${node.city}, ${node.country}\n` +
                    `${t("leader")}: ` +
                    `${node.leader}\n\n` +
                    `${t("demoNotice")}`
                );

            }
        );

    });

}


/* =========================================
   SEARCH
========================================= */

if (nodeSearch) {

    nodeSearch.addEventListener(
        "input",
        event => {

            state.search =
                event.target.value;

            renderNodes();

        }
    );

}


/* =========================================
   CONTINENT FILTER
========================================= */

if (continentFilter) {

    continentFilter.addEventListener(
        "change",
        event => {

            state.continent =
                event.target.value;

            renderNodes();

        }
    );

}


/* =========================================
   LANGUAGE
========================================= */

if (languageSelector) {

    languageSelector.addEventListener(
        "change",
        event => {

            state.language =
                event.target.value;

            updateInterface();

        }
    );

}


/* =========================================
   UPDATE INTERFACE
========================================= */

function updateInterface() {

    if (nodeSearch) {

        nodeSearch.placeholder =
            t("searchPlaceholder");

    }


    if (continentFilter) {

        const firstOption =
            continentFilter.querySelector(
                "option:first-child"
            );

        if (firstOption) {

            firstOption.textContent =
                t("allContinents");

        }

    }


    renderNodes();

}


/* =========================================
   INITIALIZE
========================================= */

function initializeNodeHub() {

    state.language =
        languageSelector?.value
        || "en-US";

    renderNodes();

}


/* =========================================
   START APPLICATION
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initializeNodeHub
);
