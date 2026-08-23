// =============================================
// NODE HUB
// Supabase + Authentication + Dashboard
// =============================================

const SUPABASE_URL =
    "https://ynqtzyzxspoxssjrjeve.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_FoDbr9qgVeeIYfzEZNNN9Q_53aHxI2g";


// =============================================
// SUPABASE
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
let currentUser = null;


// =============================================
// DOM
// =============================================

let nodeGrid;
let nodeCount;
let searchInput;
let continentFilter;


// =============================================
// START
// =============================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        nodeGrid =
            document.getElementById("node-grid");

        nodeCount =
            document.getElementById("node-count");

        searchInput =
            document.getElementById("node-search");

        continentFilter =
            document.getElementById("continent-filter");


        await initializeAuth();

        await loadNodes();

        setupSearch();

        setupLanguage();

        setupAuthForms();

        setupLogout();

        setupNavigation();

        handleRoute();

    }
);


// =============================================
// AUTH
// =============================================

async function initializeAuth() {

    try {

        const {
            data,
            error
        } = await db.auth.getSession();


        if (error) {

            console.error(
                "Session error:",
                error
            );

            return;

        }


        currentUser =
            data.session
                ? data.session.user
                : null;


        updateAuthUI();


        db.auth.onAuthStateChange(
            async (event, session) => {

                currentUser =
                    session
                        ? session.user
                        : null;


                updateAuthUI();


                if (
                    event === "SIGNED_IN"
                ) {

                    window.location.hash =
                        "dashboard";

                    handleRoute();

                }


                if (
                    event === "SIGNED_OUT"
                ) {

                    window.location.hash =
                        "home";

                    handleRoute();

                }

            }
        );

    }

    catch (error) {

        console.error(
            "Authentication error:",
            error
        );

    }

}


// =============================================
// AUTH UI
// =============================================

function updateAuthUI() {

    const signInLinks =
        document.querySelectorAll(
            'a[href="#login"]'
        );


    signInLinks.forEach(link => {

        if (currentUser) {

            link.textContent =
                "Dashboard";

            link.href =
                "#dashboard";

        } else {

            link.textContent =
                "Sign in";

            link.href =
                "#login";

        }

    });


    const accountStatus =
        document.getElementById(
            "account-status"
        );


    if (accountStatus) {

        if (currentUser) {

            accountStatus.textContent =
                currentUser.email ||
                "Signed in";

        } else {

            accountStatus.textContent =
                "Not signed in";

        }

    }


    updateSubmitLinks();

}


// =============================================
// SUBMIT NODE LINKS
// =============================================

function updateSubmitLinks() {

    const submitLinks =
        document.querySelectorAll(
            'a[href="#submit"]'
        );


    submitLinks.forEach(link => {

        link.onclick = function(event) {

            event.preventDefault();


            if (currentUser) {

                window.location.hash =
                    "submit";

            } else {

                window.location.hash =
                    "login";

            }


            handleRoute();

        };

    });

}


// =============================================
// SIGN UP
// =============================================

async function signUp() {

    const emailInput =
        document.getElementById(
            "signup-email"
        );

    const passwordInput =
        document.getElementById(
            "signup-password"
        );

    const usernameInput =
        document.getElementById(
            "signup-username"
        );


    if (
        !emailInput ||
        !passwordInput
    ) {

        alert(
            "Registration form not found."
        );

        return;

    }


    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    const username =
        usernameInput
            ? usernameInput.value.trim()
            : "";


    if (!email || !password) {

        alert(
            "Please enter your email and password."
        );

        return;

    }


    if (password.length < 8) {

        alert(
            "Password must contain at least 8 characters."
        );

        return;

    }


    try {

        const {
            data,
            error
        } = await db.auth.signUp({

            email: email,

            password: password,

            options: {

                emailRedirectTo:
                    "https://nodehubupland.github.io/node-hub/#dashboard",

                data: {

                    username:
                        username

                }

            }

        });


        if (error) {

            console.error(
                "Sign up error:",
                error
            );

            alert(
                error.message
            );

            return;

        }


        if (
            data.user &&
            !data.session
        ) {

            alert(
                "Account created successfully. Check your email to confirm your account."
            );

            return;

        }


        if (data.session) {

            currentUser =
                data.session.user;

            updateAuthUI();

            window.location.hash =
                "dashboard";

            handleRoute();

        }

    }

    catch (error) {

        console.error(
            "Unexpected sign up error:",
            error
        );

        alert(
            "Unable to create your account."
        );

    }

}


// =============================================
// SIGN IN
// =============================================

async function signIn() {

    const emailInput =
        document.getElementById(
            "login-email"
        );

    const passwordInput =
        document.getElementById(
            "login-password"
        );


    if (
        !emailInput ||
        !passwordInput
    ) {

        alert(
            "Login form not found."
        );

        return;

    }


    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    if (!email || !password) {

        alert(
            "Please enter your email and password."
        );

        return;

    }


    try {

        const {
            data,
            error
        } = await db.auth.signInWithPassword({

            email:
                email,

            password:
                password

        });


        if (error) {

            console.error(
                "Login error:",
                error
            );

            alert(
                error.message
            );

            return;

        }


        currentUser =
            data.user;


        updateAuthUI();


        window.location.hash =
            "dashboard";


        handleRoute();

    }

    catch (error) {

        console.error(
            "Unexpected login error:",
            error
        );

        alert(
            "Unable to sign in."
        );

    }

}


// =============================================
// LOGOUT
// =============================================

async function signOut() {

    try {

        const {
            error
        } = await db.auth.signOut();


        if (error) {

            console.error(
                "Logout error:",
                error
            );

            alert(
                error.message
            );

            return;

        }


        currentUser =
            null;


        updateAuthUI();


        window.location.hash =
            "home";


        handleRoute();

    }

    catch (error) {

        console.error(
            "Unexpected logout error:",
            error
        );

    }

}


// =============================================
// AUTH FORMS
// =============================================

function setupAuthForms() {

    const signupForm =
        document.getElementById(
            "signup-form"
        );

    const loginForm =
        document.getElementById(
            "login-form"
        );


    if (signupForm) {

        signupForm.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                signUp();

            }
        );

    }


    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                signIn();

            }
        );

    }

}


// =============================================
// LOGOUT BUTTONS
// =============================================

function setupLogout() {

    const buttons =
        document.querySelectorAll(
            "[data-action='logout']"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                signOut();

            }
        );

    });

}


// =============================================
// NAVIGATION
// =============================================

function setupNavigation() {

    window.addEventListener(
        "hashchange",
        handleRoute
    );


    const links =
        document.querySelectorAll(
            "a[href^='#']"
        );


    links.forEach(link => {

        link.addEventListener(
            "click",
            () => {

                setTimeout(
                    handleRoute,
                    50
                );

            }
        );

    });

}


// =============================================
// ROUTER
// =============================================

function handleRoute() {

    const hash =
        window.location.hash
            .replace(
                "#",
                ""
            )
            .toLowerCase();


    if (
        hash === "dashboard"
    ) {

        if (!currentUser) {

            window.location.hash =
                "login";

            return;

        }


        showDashboard();

        return;

    }


    if (
        hash === "submit"
    ) {

        if (!currentUser) {

            window.location.hash =
                "login";

            return;

        }


        showSubmitNode();

        return;

    }


    if (
        hash === "login"
    ) {

        showLoginSection();

        return;

    }


    showNormalSite();

}


// =============================================
// NORMAL SITE
// =============================================

function showNormalSite() {

    const dashboard =
        document.getElementById(
            "dynamic-dashboard"
        );

    const submit =
        document.getElementById(
            "dynamic-submit"
        );


    if (dashboard) {

        dashboard.remove();

    }


    if (submit) {

        submit.remove();

    }

}


// =============================================
// LOGIN
// =============================================

function showLoginSection() {

    const login =
        document.getElementById(
            "login"
        );


    if (login) {

        login.scrollIntoView({
            behavior: "smooth"
        });

    }

}


// =============================================
// DASHBOARD
// =============================================

function showDashboard() {

    removeDynamicSections();


    const section =
        document.createElement(
            "section"
        );


    section.id =
        "dynamic-dashboard";


    section.className =
        "section dashboard-section";


    const email =
        currentUser.email || "";


    section.innerHTML = `

        <div class="container">

            <div class="dashboard-box">

                <p class="eyebrow">
                    NODE HUB ACCOUNT
                </p>

                <h2>
                    Welcome to Node Hub
                </h2>

                <p>
                    You are signed in and ready to manage your Node.
                </p>

                <p>
                    <strong>
                        ${escapeHTML(email)}
                    </strong>
                </p>

                <div class="dashboard-actions">

                    <a
                        href="#submit"
                        class="button button-primary"
                    >
                        Register My Node
                    </a>

                    <a
                        href="#nodes"
                        class="button"
                    >
                        Explore Nodes
                    </a>

                    <button
                        type="button"
                        class="button"
                        data-action="logout"
                    >
                        Sign out
                    </button>

                </div>

            </div>

        </div>

    `;


    document.body.appendChild(
        section
    );


    section.scrollIntoView({
        behavior: "smooth"
    });


    const logoutButton =
        section.querySelector(
            "[data-action='logout']"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            signOut
        );

    }


    const submitButton =
        section.querySelector(
            'a[href="#submit"]'
        );


    if (submitButton) {

        submitButton.addEventListener(
            "click",
            event => {

                event.preventDefault();

                window.location.hash =
                    "submit";

                handleRoute();

            }
        );

    }

}


// =============================================
// SUBMIT NODE
// =============================================

function showSubmitNode() {

    removeDynamicSections();


    const section =
        document.createElement(
            "section"
        );


    section.id =
        "dynamic-submit";


    section.className =
        "section submit-section";


    section.innerHTML = `

        <div class="container">

            <div class="dashboard-box">

                <p class="eyebrow">
                    NODE REGISTRATION
                </p>

                <h2>
                    Register Your Node
                </h2>

                <p>
                    Submit your Node for review by the Node Hub team.
                </p>

                <form id="dynamic-node-form">

                    <label>
                        Node Name
                        <input
                            type="text"
                            id="new-node-name"
                            required
                        >
                    </label>

                    <label>
                        City
                        <input
                            type="text"
                            id="new-node-city"
                            required
                        >
                    </label>

                    <label>
                        Country
                        <input
                            type="text"
                            id="new-node-country"
                            required
                        >
                    </label>

                    <label>
                        Continent
                        <select
                            id="new-node-continent"
                            required
                        >
                            <option value="">
                                Select continent
                            </option>

                            <option value="North America">
                                North America
                            </option>

                            <option value="South America">
                                South America
                            </option>

                            <option value="Europe">
                                Europe
                            </option>

                            <option value="Asia">
                                Asia
                            </option>

                            <option value="Africa">
                                Africa
                            </option>

                            <option value="Oceania">
                                Oceania
                            </option>

                        </select>
                    </label>

                    <label>
                        Description
                        <textarea
                            id="new-node-description"
                            rows="5"
                        ></textarea>
                    </label>

                    <label>
                        Discord URL
                        <input
                            type="url"
                            id="new-node-discord"
                            placeholder="https://discord.gg/..."
                        >
                    </label>

                    <label>
                        Telegram URL
                        <input
                            type="url"
                            id="new-node-telegram"
                            placeholder="https://t.me/..."
                        >
                    </label>

                    <label>
                        X / Twitter URL
                        <input
                            type="url"
                            id="new-node-twitter"
                            placeholder="https://x.com/..."
                        >
                    </label>

                    <div class="dashboard-actions">

                        <button
                            type="submit"
                            class="button button-primary"
                        >
                            Submit Node
                        </button>

                        <a
                            href="#dashboard"
                            class="button"
                        >
                            Back to Dashboard
                        </a>

                    </div>

                </form>

                <div
                    id="node-submit-message"
                ></div>

            </div>

        </div>

    `;


    document.body.appendChild(
        section
    );


    section.scrollIntoView({
        behavior: "smooth"
    });


    const form =
        document.getElementById(
            "dynamic-node-form"
        );


    if (form) {

        form.addEventListener(
            "submit",
            submitNode
        );

    }

}


// =============================================
// SUBMIT NODE TO SUPABASE
// =============================================

async function submitNode(event) {

    event.preventDefault();


    if (!currentUser) {

        alert(
            "You must be signed in."
        );

        window.location.hash =
            "login";

        return;

    }


    const message =
        document.getElementById(
            "node-submit-message"
        );


    const name =
        document.getElementById(
            "new-node-name"
        ).value.trim();


    const city =
        document.getElementById(
            "new-node-city"
        ).value.trim();


    const country =
        document.getElementById(
            "new-node-country"
        ).value.trim();


    const continent =
        document.getElementById(
            "new-node-continent"
        ).value;


    const description =
        document.getElementById(
            "new-node-description"
        ).value.trim();


    const discord =
        document.getElementById(
            "new-node-discord"
        ).value.trim();


    const telegram =
        document.getElementById(
            "new-node-telegram"
        ).value.trim();


    const twitter =
        document.getElementById(
            "new-node-twitter"
        ).value.trim();


    if (message) {

        message.textContent =
            "Submitting Node...";

    }


    try {

        const {
            data,
            error
        } = await db
            .from("nodes")
            .insert({

                name:
                    name,

                city:
                    city,

                country:
                    country,

                continent:
                    continent,

                description:
                    description,

                discord_url:
                    discord || null,

                telegram_url:
                    telegram || null,

                twitter_url:
                    twitter || null,

                status:
                    "pending",

                created_by:
                    currentUser.id

            })
            .select()
            .single();


        if (error) {

            console.error(
                "Node submission error:",
                error
            );


            if (message) {

                message.textContent =
                    error.message;

            }

            return;

        }


        console.log(
            "Node created:",
            data
        );


        if (message) {

            message.textContent =
                "Node submitted successfully. It is now waiting for review.";

        }


        document
            .getElementById(
                "dynamic-node-form"
            )
            .reset();


    }

    catch (error) {

        console.error(
            "Unexpected submission error:",
            error
        );


        if (message) {

            message.textContent =
                "Unable to submit your Node.";

        }

    }

}


// =============================================
// REMOVE DYNAMIC SECTIONS
// =============================================

function removeDynamicSections() {

    const dashboard =
        document.getElementById(
            "dynamic-dashboard"
        );


    const submit =
        document.getElementById(
            "dynamic-submit"
        );


    if (dashboard) {

        dashboard.remove();

    }


    if (submit) {

        submit.remove();

    }

}


// =============================================
// LOAD APPROVED NODES
// =============================================

async function loadNodes() {

    try {

        const {
            data,
            error
        } = await db
            .from("nodes")
            .select("*")
            .eq(
                "status",
                "approved"
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "Error loading Nodes:",
                error
            );

            showEmptyDirectory();

            return;

        }


        nodes =
            data || [];


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

    if (!nodeGrid) {

        return;

    }


    nodeGrid.innerHTML =
        "";


    if (nodeCount) {

        nodeCount.textContent =
            `${list.length} ${
                list.length === 1
                    ? "Node"
                    : "Nodes"
            }`;

    }


    if (!list.length) {

        showEmptyDirectory();

        return;

    }


    list.forEach(
        node => {

            nodeGrid.appendChild(
                createNodeCard(node)
            );

        }
    );

}


// =============================================
// NODE CARD
// =============================================

function createNodeCard(node) {

    const article =
        document.createElement(
            "article"
        );


    article.className =
        "node-card";


    const logo =
        node.logo_url || "";


    const imageHTML =
        logo

            ? `
                <div class="node-card-image">

                    <img
                        src="${escapeHTML(logo)}"
                        alt="${escapeHTML(
                            node.name || "Node"
                        )}"
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
                    node.name ||
                    "Unnamed Node"
                )}
            </h3>

            <p class="node-location">

                ${escapeHTML(
                    node.city || ""
                )}

                ${
                    node.country
                        ? `, ${escapeHTML(
                            node.country
                        )}`
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
                                href="${safeURL(
                                    node.discord_url
                                )}"
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
                                href="${safeURL(
                                    node.telegram_url
                                )}"
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
                                href="${safeURL(
                                    node.twitter_url
                                )}"
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

    if (!nodeGrid) {

        return;

    }


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


    updateSubmitLinks();


    if (nodeCount) {

        nodeCount.textContent =
            "0 Nodes";

    }

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
        nodes.filter(
            node => {

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

            }
        );


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

            localStorage.setItem(
                "nodehub-language",
                selector.value
            );

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
// HTML SECURITY
// =============================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// =============================================
// SAFE URL
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
