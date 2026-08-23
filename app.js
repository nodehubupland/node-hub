// =============================================
// NODE HUB
// Supabase + Frontend + Authentication
// Dashboard + Directory
// =============================================


// =============================================
// SUPABASE CONFIG
// =============================================

const SUPABASE_URL =
    "https://ynqtzyzxspoxssjrjeve.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_FoDbr9qVeeIYfzEZNNN9Q_53aHxI2g";


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
let currentUser = null;


// =============================================
// DOM REFERENCES
// =============================================

let nodeGrid;
let nodeCount;
let searchInput;
let continentFilter;


// =============================================
// INITIALIZE
// =============================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        cacheDOM();

        setupLanguage();

        setupSearch();

        setupAuthForms();

        setupLogout();

        setupNavigation();

        await initializeAuth();

        await loadNodes();

        handleRoute();

    }
);


// =============================================
// CACHE DOM
// =============================================

function cacheDOM() {

    nodeGrid =
        document.getElementById(
            "node-grid"
        );

    nodeCount =
        document.getElementById(
            "node-count"
        );

    searchInput =
        document.getElementById(
            "node-search"
        );

    continentFilter =
        document.getElementById(
            "continent-filter"
        );

}


// =============================================
// AUTHENTICATION
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

            currentUser = null;

            updateAuthUI();

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
                    event === "SIGNED_IN" &&
                    session
                ) {

                    handleRoute();

                }


                if (
                    event === "SIGNED_OUT"
                ) {

                    showHome();

                }

            }
        );

    }

    catch (error) {

        console.error(
            "Authentication error:",
            error
        );

        currentUser = null;

        updateAuthUI();

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


    signInLinks.forEach(
        link => {

            const text =
                link.querySelector(
                    "#auth-nav-text"
                );


            if (text) {

                text.textContent =
                    currentUser
                        ? "Dashboard"
                        : "Sign in";

            }
            else {

                link.textContent =
                    currentUser
                        ? "Dashboard"
                        : "Sign in";

            }


            if (currentUser) {

                link.setAttribute(
                    "href",
                    "#dashboard"
                );

            }
            else {

                link.setAttribute(
                    "href",
                    "#login"
                );

            }

        }
    );


    const accountStatus =
        document.getElementById(
            "account-status"
        );


    if (accountStatus) {

        if (currentUser) {

            accountStatus.textContent =
                `Signed in as ${
                    currentUser.email || "User"
                }`;

        }
        else {

            accountStatus.textContent =
                "Not signed in";

        }

    }

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


    if (
        !email ||
        !password
    ) {

        alert(
            "Please enter your email and password."
        );

        return;

    }


    if (
        password.length < 8
    ) {

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
                    "https://nodehubupland.github.io/node-hub/",

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


        if (data.user) {

            alert(
                "Account created. Please check your email to confirm your account."
            );

            emailInput.value =
                "";

            passwordInput.value =
                "";

            if (usernameInput) {

                usernameInput.value =
                    "";

            }

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


    if (
        !email ||
        !password
    ) {

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


        alert(
            "Welcome to Node Hub."
        );


        window.location.hash =
            "dashboard";

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


        alert(
            "You have been signed out."
        );

    }

    catch (error) {

        console.error(
            "Unexpected logout error:",
            error
        );

    }

}


// =============================================
// AUTH FORM EVENTS
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
// LOGOUT EVENTS
// =============================================

function setupLogout() {

    const logoutButtons =
        document.querySelectorAll(
            "[data-action='logout']"
        );


    logoutButtons.forEach(
        button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    signOut();

                }
            );

        }
    );

}


// =============================================
// NAVIGATION
// =============================================

function setupNavigation() {

    window.addEventListener(
        "hashchange",
        handleRoute
    );


    document.addEventListener(
        "click",
        event => {

            const link =
                event.target.closest(
                    'a[href="#dashboard"]'
                );


            if (!link) {
                return;
            }


            if (!currentUser) {

                event.preventDefault();

                window.location.hash =
                    "login";

                alert(
                    "Please sign in to access your dashboard."
                );

            }

        }
    );

}


// =============================================
// ROUTER
// =============================================

function handleRoute() {

    const hash =
        window.location.hash
            .replace("#", "")
            .trim();


    if (
        hash === "dashboard"
    ) {

        if (!currentUser) {

            showHome();

            window.location.hash =
                "login";

            return;

        }


        showDashboard();

        return;

    }


    hideDashboard();

}


// =============================================
// SHOW DASHBOARD
// =============================================

function showDashboard() {

    let dashboard =
        document.getElementById(
            "dashboard"
        );


    if (!dashboard) {

        dashboard =
            createDashboard();

        document
            .querySelector("main")
            .appendChild(
                dashboard
            );

    }


    dashboard.style.display =
        "block";


    document
        .querySelectorAll(
            "main > section:not(#dashboard)"
        )
        .forEach(
            section => {

                section.style.display =
                    "none";

            }
        );


    renderDashboard();

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// =============================================
// HIDE DASHBOARD
// =============================================

function hideDashboard() {

    const dashboard =
        document.getElementById(
            "dashboard"
        );


    if (dashboard) {

        dashboard.style.display =
            "none";

    }


    document
        .querySelectorAll(
            "main > section:not(#dashboard)"
        )
        .forEach(
            section => {

                section.style.display =
                    "";

            }
        );

}


// =============================================
// HOME
// =============================================

function showHome() {

    hideDashboard();

    window.location.hash =
        "home";

}


// =============================================
// CREATE DASHBOARD
// =============================================

function createDashboard() {

    const section =
        document.createElement(
            "section"
        );


    section.id =
        "dashboard";

    section.className =
        "section section-alt";


    section.innerHTML = `

        <div class="container">

            <div class="section-heading">

                <span class="eyebrow">
                    NODE HUB ACCOUNT
                </span>

                <h1>
                    Dashboard
                </h1>

                <p>
                    Manage your Node Hub account
                    and Node submissions.
                </p>

            </div>


            <div class="auth-container">

                <div class="auth-card">

                    <span class="eyebrow">
                        ACCOUNT
                    </span>

                    <h2>
                        Welcome
                    </h2>

                    <p id="dashboard-welcome">
                        Loading account...
                    </p>

                    <p id="dashboard-email">
                    </p>

                    <button
                        type="button"
                        id="register-node-button"
                        class="button button-primary"
                    >
                        Register My Node
                    </button>

                    <button
                        type="button"
                        data-action="logout"
                        class="button button-secondary"
                    >
                        Sign Out
                    </button>

                </div>


                <div class="auth-card">

                    <span class="eyebrow">
                        YOUR NODES
                    </span>

                    <h2>
                        My Nodes
                    </h2>

                    <div id="my-nodes">

                        <p>
                            No Nodes registered yet.
                        </p>

                    </div>

                </div>

            </div>


            <div
                id="register-node-panel"
                style="display:none;"
            >

                <div class="auth-card">

                    <span class="eyebrow">
                        NODE REGISTRATION
                    </span>

                    <h2>
                        Register My Node
                    </h2>

                    <p>
                        Node registration will be submitted
                        for review by the Node Hub team.
                    </p>


                    <form id="register-node-form">

                        <label>
                            Node Name
                        </label>

                        <input
                            type="text"
                            id="node-name"
                            required
                            placeholder="Your Node name"
                        >


                        <label>
                            Description
                        </label>

                        <textarea
                            id="node-description"
                            rows="5"
                            placeholder="Tell us about your Node"
                        ></textarea>


                        <label>
                            City
                        </label>

                        <input
                            type="text"
                            id="node-city"
                            placeholder="City"
                        >


                        <label>
                            Country
                        </label>

                        <input
                            type="text"
                            id="node-country"
                            placeholder="Country"
                        >


                        <label>
                            Continent
                        </label>

                        <select
                            id="node-continent"
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


                        <label>
                            Logo URL
                        </label>

                        <input
                            type="url"
                            id="node-logo"
                            placeholder="https://..."
                        >


                        <label>
                            Discord
                        </label>

                        <input
                            type="url"
                            id="node-discord"
                            placeholder="https://discord.gg/..."
                        >


                        <label>
                            X / Twitter
                        </label>

                        <input
                            type="url"
                            id="node-twitter"
                            placeholder="https://x.com/..."
                        >


                        <label>
                            Telegram
                        </label>

                        <input
                            type="url"
                            id="node-telegram"
                            placeholder="https://t.me/..."
                        >


                        <div style="margin-top:20px;">

                            <button
                                type="submit"
                                class="button button-primary"
                            >
                                Submit Node for Review
                            </button>

                            <button
                                type="button"
                                id="cancel-register-node"
                                class="button button-secondary"
                            >
                                Cancel
                            </button>

                        </div>

                    </form>

                </div>

            </div>


            <div style="margin-top:30px;">

                <a
                    href="#home"
                    class="button button-secondary"
                >
                    Back to Directory
                </a>

            </div>

        </div>

    `;


    return section;

}


// =============================================
// RENDER DASHBOARD
// =============================================

function renderDashboard() {

    if (!currentUser) {
        return;
    }


    const welcome =
        document.getElementById(
            "dashboard-welcome"
        );

    const email =
        document.getElementById(
            "dashboard-email"
        );


    const username =
        currentUser.user_metadata
            ?.username ||
        "Node Hub Member";


    if (welcome) {

        welcome.textContent =
            `Welcome, ${username}`;

    }


    if (email) {

        email.textContent =
            currentUser.email || "";

    }


    const logoutButtons =
        document.querySelectorAll(
            "#dashboard [data-action='logout']"
        );


    logoutButtons.forEach(
        button => {

            button.onclick =
                event => {

                    event.preventDefault();

                    signOut();

                };

        }
    );


    const registerButton =
        document.getElementById(
            "register-node-button"
        );


    const registerPanel =
        document.getElementById(
            "register-node-panel"
        );


    const cancelButton =
        document.getElementById(
            "cancel-register-node"
        );


    if (registerButton) {

        registerButton.onclick =
            () => {

                if (registerPanel) {

                    registerPanel.style.display =
                        "block";

                }

                registerButton.style.display =
                    "none";

            };

    }


    if (cancelButton) {

        cancelButton.onclick =
            () => {

                if (registerPanel) {

                    registerPanel.style.display =
                        "none";

                }

                if (registerButton) {

                    registerButton.style.display =
                        "inline-flex";

                }

            };

    }


    const registerForm =
        document.getElementById(
            "register-node-form"
        );


    if (registerForm) {

        registerForm.onsubmit =
            event => {

                event.preventDefault();

                submitNode();

            };

    }


    loadMyNodes();

}


// =============================================
// LOAD USER NODES
// =============================================

async function loadMyNodes() {

    const container =
        document.getElementById(
            "my-nodes"
        );


    if (
        !container ||
        !currentUser
    ) {

        return;

    }


    container.innerHTML =
        "<p>Loading your Nodes...</p>";


    try {

        /*
         * IMPORTANT:
         * We first try the administrator
         * relationship using the current
         * authenticated user.
         *
         * If your final database uses another
         * column name, we will adjust this
         * when building the full Node Admin system.
         */

        const {
            data,
            error
        } = await db
            .from("nodes")
            .select("*")
            .eq(
                "created_by",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.warn(
                "Could not load user Nodes:",
                error.message
            );

            container.innerHTML = `

                <p>
                    No Nodes registered yet.
                </p>

                <p>
                    Use "Register My Node" to
                    submit your first Node.
                </p>

            `;

            return;

        }


        if (!data || !data.length) {

            container.innerHTML = `

                <p>
                    No Nodes registered yet.
                </p>

                <p>
                    Your submitted Nodes will
                    appear here.
                </p>

            `;

            return;

        }


        container.innerHTML =
            "";


        data.forEach(
            node => {

                const card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "about-card";


                card.innerHTML = `

                    <h3>
                        ${escapeHTML(
                            node.name ||
                            "Unnamed Node"
                        )}
                    </h3>

                    <p>
                        Status:
                        <strong>
                            ${escapeHTML(
                                node.status ||
                                "pending"
                            )}
                        </strong>
                    </p>

                    ${
                        node.city
                            ? `
                                <p>
                                    ${escapeHTML(
                                        node.city
                                    )}
                                    ${
                                        node.country
                                            ? `, ${escapeHTML(
                                                node.country
                                            )}`
                                            : ""
                                    }
                                </p>
                            `
                            : ""
                    }

                `;


                container.appendChild(
                    card
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Unexpected Node loading error:",
            error
        );


        container.innerHTML =
            "<p>No Nodes registered yet.</p>";

    }

}


// =============================================
// SUBMIT NODE
// =============================================

async function submitNode() {

    if (!currentUser) {

        alert(
            "Please sign in first."
        );

        window.location.hash =
            "login";

        return;

    }


    const name =
        document.getElementById(
            "node-name"
        )?.value.trim();


    const description =
        document.getElementById(
            "node-description"
        )?.value.trim();


    const city =
        document.getElementById(
            "node-city"
        )?.value.trim();


    const country =
        document.getElementById(
            "node-country"
        )?.value.trim();


    const continent =
        document.getElementById(
            "node-continent"
        )?.value;


    const logo =
        document.getElementById(
            "node-logo"
        )?.value.trim();


    const discord =
        document.getElementById(
            "node-discord"
        )?.value.trim();


    const twitter =
        document.getElementById(
            "node-twitter"
        )?.value.trim();


    const telegram =
        document.getElementById(
            "node-telegram"
        )?.value.trim();


    if (!name) {

        alert(
            "Please enter your Node name."
        );

        return;

    }


    try {

        const {
            error
        } = await db
            .from("nodes")
            .insert({

                name:
                    name,

                description:
                    description || null,

                city:
                    city || null,

                country:
                    country || null,

                continent:
                    continent || null,

                logo_url:
                    logo || null,

                discord_url:
                    discord || null,

                twitter_url:
                    twitter || null,

                telegram_url:
                    telegram || null,

                status:
                    "pending",

                created_by:
                    currentUser.id

            });


        if (error) {

            console.error(
                "Node submission error:",
                error
            );

            alert(
                error.message
            );

            return;

        }


        alert(
            "Your Node has been submitted for review."
        );


        const form =
            document.getElementById(
                "register-node-form"
            );


        if (form) {

            form.reset();

        }


        const panel =
            document.getElementById(
                "register-node-panel"
            );


        const button =
            document.getElementById(
                "register-node-button"
            );


        if (panel) {

            panel.style.display =
                "none";

        }


        if (button) {

            button.style.display =
                "inline-flex";

        }


        await loadMyNodes();

        await loadNodes();

    }

    catch (error) {

        console.error(
            "Unexpected Node submission error:",
            error
        );

        alert(
            "Unable to submit your Node."
        );

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


        renderNodes(
            nodes
        );

    }

    catch (error) {

        console.error(
            "Unexpected Node error:",
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

            const card =
                createNodeCard(
                    node
                );


            nodeGrid.appendChild(
                card
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
                            node.name ||
                            "Node"
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
                    text.includes(
                        search
                    );


                const matchesContinent =
                    !continent ||
                    node.continent ===
                        continent;


                return (
                    matchesSearch &&
                    matchesContinent
                );

            }
        );


    renderNodes(
        filtered
    );

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


            if (
                language === "pt-BR"
            ) {

                alert(
                    "Português (BR) translation will be activated in the next development stage."
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
// URL VALIDATION
// =============================================

function safeURL(url) {

    try {

        const parsed =
            new URL(url);


        if (
            parsed.protocol ===
                "https:" ||

            parsed.protocol ===
                "http:"
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
