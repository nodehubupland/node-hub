// =====================================================
// NODE HUB
// Supabase + Authentication + Dashboard + Node Upload
// =====================================================

// =====================================================
// SUPABASE
// =====================================================

const SUPABASE_URL =
    "https://ynqtzyzxspoxssjrjeve.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_FoDbr9qgVeeIYfzEZNNN9Q_53aHxI2g";

const { createClient } = supabase;

const db = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// =====================================================
// GLOBAL STATE
// =====================================================

let currentUser = null;
let nodes = [];


// =====================================================
// DOM
// =====================================================

const nodeGrid =
    document.getElementById("node-grid");

const nodeCount =
    document.getElementById("node-count");

const searchInput =
    document.getElementById("node-search");

const continentFilter =
    document.getElementById("continent-filter");


// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await initializeAuth();

        await loadNodes();

        setupSearch();

        setupLanguage();

        setupAuthForms();

        setupLogout();

        setupNavigation();

        handleRoute();

        window.addEventListener(
            "hashchange",
            handleRoute
        );

    }
);


// =====================================================
// AUTHENTICATION
// =====================================================

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

                    await loadNodes();

                    updateDashboard();

                }


                if (
                    event === "SIGNED_OUT"
                ) {

                    updateAuthUI();

                    removeDashboard();

                }

            }
        );

    }

    catch (error) {

        console.error(
            "Authentication initialization error:",
            error
        );

    }

}


// =====================================================
// AUTH UI
// =====================================================

function updateAuthUI() {

    const authNavText =
        document.getElementById(
            "auth-nav-text"
        );


    if (authNavText) {

        authNavText.textContent =
            currentUser
                ? "Dashboard"
                : "Sign in";

    }


    const accountStatus =
        document.getElementById(
            "account-status"
        );


    if (accountStatus) {

        accountStatus.textContent =
            currentUser
                ? (
                    currentUser.email ||
                    "Signed in"
                )
                : "Not signed in";

    }

}


// =====================================================
// ROUTING
// =====================================================

function handleRoute() {

    const hash =
        window.location.hash
            .replace("#", "")
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
        hash === "register"
    ) {

        if (!currentUser) {

            window.location.hash =
                "login";

            return;

        }


        showDashboard();

        setTimeout(
            () => {

                const form =
                    document.getElementById(
                        "dashboard-node-form"
                    );

                if (form) {

                    form.scrollIntoView({
                        behavior: "smooth"
                    });

                }

            },
            100
        );

        return;

    }


    if (
        hash === "login"
    ) {

        if (currentUser) {

            window.location.hash =
                "dashboard";

            return;

        }

        return;

    }

}


// =====================================================
// NAVIGATION
// =====================================================

function setupNavigation() {

    document.addEventListener(
        "click",
        event => {

            const link =
                event.target.closest(
                    "a[href]"
                );


            if (!link) {
                return;
            }


            const href =
                link.getAttribute(
                    "href"
                );


            if (
                href === "#submit"
            ) {

                event.preventDefault();


                if (currentUser) {

                    window.location.hash =
                        "register";

                } else {

                    window.location.hash =
                        "login";

                }

            }


            if (
                href === "#login"
            ) {

                if (currentUser) {

                    event.preventDefault();

                    window.location.hash =
                        "dashboard";

                }

            }

        }
    );

}


// =====================================================
// SIGN UP
// =====================================================

async function signUp() {

    const usernameInput =
        document.getElementById(
            "signup-username"
        );

    const emailInput =
        document.getElementById(
            "signup-email"
        );

    const passwordInput =
        document.getElementById(
            "signup-password"
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


    const username =
        usernameInput
            ? usernameInput.value.trim()
            : "";


    const email =
        emailInput.value
            .trim()
            .toLowerCase();


    const password =
        passwordInput.value;


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

            email,

            password,

            options: {

                emailRedirectTo:
                    "https://nodehubupland.github.io/node-hub/",

                data: {

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
            data.session
        ) {

            currentUser =
                data.user;


            await createProfile(
                username
            );


            updateAuthUI();


            alert(
                "Account created successfully."
            );


            window.location.hash =
                "dashboard";


            return;

        }


        if (data.user) {

            alert(
                "Account created. Please check your email to confirm your account."
            );

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


// =====================================================
// CREATE PROFILE
// =====================================================

async function createProfile(
    username
) {

    if (!currentUser) {
        return;
    }


    try {

        const {
            error
        } = await db
            .from("profiles")
            .upsert({

                id:
                    currentUser.id,

                username:
                    username ||
                    currentUser.email
                        ?.split("@")[0] ||
                    "User",

                email:
                    currentUser.email

            }, {

                onConflict: "id"

            });


        if (error) {

            console.warn(
                "Profile creation warning:",
                error
            );

        }

    }

    catch (error) {

        console.warn(
            "Profile creation error:",
            error
        );

    }

}


// =====================================================
// SIGN IN
// =====================================================

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
        emailInput.value
            .trim()
            .toLowerCase();


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

            email,

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


// =====================================================
// LOGOUT
// =====================================================

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


        alert(
            "You have been signed out."
        );


        window.location.hash =
            "home";


        location.reload();

    }

    catch (error) {

        console.error(
            "Unexpected logout error:",
            error
        );

    }

}


// =====================================================
// AUTH FORMS
// =====================================================

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


// =====================================================
// LOGOUT BUTTONS
// =====================================================

function setupLogout() {

    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-action='logout']"
                );


            if (!button) {
                return;
            }


            event.preventDefault();

            signOut();

        }
    );

}


// =====================================================
// LOAD APPROVED NODES
// =====================================================

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
            "Unexpected Node loading error:",
            error
        );

        showEmptyDirectory();

    }

}


// =====================================================
// RENDER NODES
// =====================================================

function renderNodes(
    list
) {

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


// =====================================================
// NODE CARD
// =====================================================

function createNodeCard(
    node
) {

    const article =
        document.createElement(
            "article"
        );


    article.className =
        "node-card";


    const logo =
        node.logo_url ||
        node.image_url ||
        "";


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
                node.upland_location
                    ? `
                        <p class="node-upland-location">
                            Upland:
                            ${escapeHTML(
                                node.upland_location
                            )}
                        </p>
                    `
                    : ""
            }

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


// =====================================================
// EMPTY DIRECTORY
// =====================================================

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


// =====================================================
// SEARCH
// =====================================================

function setupSearch() {

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            filterNodes
        );

    }


    if (continentFilter) {

        continentFilter.addEventListener(
            "change",
            filterNodes
        );

    }

}


// =====================================================
// FILTER
// =====================================================

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

                    node.upland_location,

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


    renderNodes(
        filtered
    );

}


// =====================================================
// DASHBOARD
// =====================================================

async function showDashboard() {

    if (!currentUser) {

        window.location.hash =
            "login";

        return;

    }


    let dashboard =
        document.getElementById(
            "nodehub-dashboard"
        );


    if (!dashboard) {

        dashboard =
            createDashboard();


        document.body.appendChild(
            dashboard
        );

    }


    dashboard.style.display =
        "block";


    dashboard.scrollIntoView({
        behavior: "smooth"
    });


    await updateDashboard();

}


// =====================================================
// CREATE DASHBOARD
// =====================================================

function createDashboard() {

    const section =
        document.createElement(
            "section"
        );


    section.id =
        "nodehub-dashboard";


    section.className =
        "section section-alt";


    section.innerHTML = `

        <div class="container">

            <div class="section-heading">

                <span class="eyebrow">
                    NODE HUB ACCOUNT
                </span>

                <h2>
                    Dashboard
                </h2>

                <p>
                    Manage your Node Hub account
                    and Node submissions.
                </p>

            </div>


            <div class="auth-card">

                <span class="eyebrow">
                    ACCOUNT
                </span>

                <h3>
                    Welcome
                </h3>

                <p id="dashboard-welcome">
                    Welcome to Node Hub.
                </p>

                <p id="dashboard-email">
                    Loading...
                </p>

                <button
                    type="button"
                    class="button button-secondary"
                    data-action="logout"
                >
                    Sign Out
                </button>

            </div>


            <div class="auth-card">

                <span class="eyebrow">
                    YOUR NODES
                </span>

                <h3>
                    My Nodes
                </h3>

                <div id="my-nodes">
                    Loading your Nodes...
                </div>

            </div>


            <div
                id="dashboard-node-form"
                class="auth-card"
            >

                <span class="eyebrow">
                    NODE REGISTRATION
                </span>

                <h3>
                    Register My Node
                </h3>

                <p>
                    Node registration will be submitted
                    for review by the Node Hub team.
                </p>


                <form id="node-registration-form">

                    <label for="node-name">
                        Node Name
                    </label>

                    <input
                        type="text"
                        id="node-name"
                        required
                        placeholder="Node name"
                    >


                    <label for="node-description">
                        Description
                    </label>

                    <textarea
                        id="node-description"
                        rows="4"
                        placeholder="Tell us about your Node"
                    ></textarea>


                    <label for="node-city">
                        City
                    </label>

                    <input
                        type="text"
                        id="node-city"
                        required
                        placeholder="City"
                    >


                    <label for="node-country">
                        Country
                    </label>

                    <input
                        type="text"
                        id="node-country"
                        required
                        placeholder="Country"
                    >


                    <label for="node-upland-location">
                        Upland Location
                    </label>

                    <input
                        type="text"
                        id="node-upland-location"
                        placeholder="Example: Chicago, Illinois"
                    >

                    <small>
                        Enter the location or city used by your Node in Upland.
                    </small>


                    <label for="node-continent">
                        Continent
                    </label>

                    <select
                        id="node-continent"
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


                    <label for="node-logo">
                        Node Logo
                    </label>

                    <input
                        type="file"
                        id="node-logo"
                        accept="image/png,image/jpeg,image/webp"
                    >

                    <small>
                        PNG, JPG or WEBP. Maximum 5 MB.
                    </small>


                    <div id="node-image-preview"></div>


                    <label for="node-discord">
                        Discord
                    </label>

                    <input
                        type="url"
                        id="node-discord"
                        placeholder="https://discord.gg/..."
                    >


                    <label for="node-twitter">
                        X / Twitter
                    </label>

                    <input
                        type="url"
                        id="node-twitter"
                        placeholder="https://x.com/..."
                    >


                    <label for="node-telegram">
                        Telegram
                    </label>

                    <input
                        type="url"
                        id="node-telegram"
                        placeholder="https://t.me/..."
                    >


                    <button
                        type="submit"
                        class="button button-primary"
                    >
                        Submit Node for Review
                    </button>


                    <button
                        type="button"
                        id="cancel-node-registration"
                        class="button button-secondary"
                    >
                        Cancel
                    </button>

                </form>

            </div>

        </div>

    `;


    setTimeout(
        setupNodeRegistration,
        0
    );


    return section;

}


// =====================================================
// UPDATE DASHBOARD
// =====================================================

async function updateDashboard() {

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


    if (email) {

        email.textContent =
            currentUser.email || "";

    }


    let username =
        currentUser.user_metadata
            ?.username;


    try {

        const {
            data
        } = await db
            .from("profiles")
            .select("username")
            .eq(
                "id",
                currentUser.id
            )
            .maybeSingle();


        if (
            data &&
            data.username
        ) {

            username =
                data.username;

        }

    }

    catch (error) {

        console.warn(
            "Could not load profile:",
            error
        );

    }


    if (welcome) {

        welcome.textContent =
            `Welcome, ${
                username ||
                "Node Administrator"
            }`;

    }


    await loadMyNodes();

}


// =====================================================
// LOAD USER NODES
// =====================================================

async function loadMyNodes() {

    const container =
        document.getElementById(
            "my-nodes"
        );


    if (!container) {
        return;
    }


    if (!currentUser) {

        container.textContent =
            "Please sign in.";

        return;

    }


    try {

        const {
            data,
            error
        } = await db
            .from("nodes")
            .select("*")
            .eq(
                "user_id",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "My Nodes error:",
                error
            );


            container.innerHTML = `
                <p>
                    Unable to load your Nodes.
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
                    Use "Register My Node"
                    to submit your first Node.
                </p>

            `;

            return;

        }


        container.innerHTML =
            data
                .map(
                    node => {

                        return `

                            <div class="node-card">

                                ${
                                    node.logo_url
                                        ? `
                                            <img
                                                src="${escapeHTML(
                                                    node.logo_url
                                                )}"
                                                alt="${escapeHTML(
                                                    node.name
                                                )}"
                                                style="
                                                    width:100%;
                                                    max-height:220px;
                                                    object-fit:contain;
                                                "
                                            >
                                        `
                                        : ""
                                }

                                <div class="node-card-content">

                                    <h3>
                                        ${escapeHTML(
                                            node.name
                                        )}
                                    </h3>

                                    <p>
                                        ${escapeHTML(
                                            node.city || ""
                                        )},
                                        ${escapeHTML(
                                            node.country || ""
                                        )}
                                    </p>

                                    ${
                                        node.upland_location
                                            ? `
                                                <p>
                                                    Upland Location:
                                                    <strong>
                                                        ${escapeHTML(
                                                            node.upland_location
                                                        )}
                                                    </strong>
                                                </p>
                                            `
                                            : ""
                                    }

                                    <p>
                                        Status:
                                        <strong>
                                            ${escapeHTML(
                                                node.status ||
                                                "pending"
                                            )}
                                        </strong>
                                    </p>

                                </div>

                            </div>

                        `;

                    }
                )
                .join("");

    }

    catch (error) {

        console.error(
            "Unexpected My Nodes error:",
            error
        );

    }

}


// =====================================================
// NODE REGISTRATION
// =====================================================

function setupNodeRegistration() {

    const form =
        document.getElementById(
            "node-registration-form"
        );


    if (!form) {
        return;
    }


    const imageInput =
        document.getElementById(
            "node-logo"
        );


    if (imageInput) {

        imageInput.addEventListener(
            "change",
            previewNodeImage
        );

    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            await submitNode();

        }
    );


    const cancelButton =
        document.getElementById(
            "cancel-node-registration"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            () => {

                window.location.hash =
                    "home";

            }
        );

    }

}


// =====================================================
// IMAGE PREVIEW
// =====================================================

function previewNodeImage(
    event
) {

    const file =
        event.target.files?.[0];


    const preview =
        document.getElementById(
            "node-image-preview"
        );


    if (!preview) {
        return;
    }


    preview.innerHTML =
        "";


    if (!file) {
        return;
    }


    if (!file.type.startsWith("image/")) {

        alert(
            "Please select an image file."
        );

        event.target.value =
            "";

        return;

    }


    if (
        file.size >
        5 * 1024 * 1024
    ) {

        alert(
            "The image must be smaller than 5 MB."
        );

        event.target.value =
            "";

        return;

    }


    const image =
        document.createElement(
            "img"
        );


    image.src =
        URL.createObjectURL(
            file
        );


    image.style.maxWidth =
        "250px";

    image.style.maxHeight =
        "250px";

    image.style.marginTop =
        "15px";

    image.style.objectFit =
        "contain";


    preview.appendChild(
        image
    );

}


// =====================================================
// SUBMIT NODE
// =====================================================

async function submitNode() {

    if (!currentUser) {

        alert(
            "You must be signed in to register a Node."
        );

        window.location.hash =
            "login";

        return;

    }


    const name =
        getValue("node-name");

    const description =
        getValue("node-description");

    const city =
        getValue("node-city");

    const country =
        getValue("node-country");

    const uplandLocation =
        getValue("node-upland-location");

    const continent =
        getValue("node-continent");

    const discord =
        getValue("node-discord");

    const twitter =
        getValue("node-twitter");

    const telegram =
        getValue("node-telegram");


    if (
        !name ||
        !city ||
        !country ||
        !continent
    ) {

        alert(
            "Please complete Node Name, City, Country and Continent."
        );

        return;

    }


    const imageInput =
        document.getElementById(
            "node-logo"
        );


    const imageFile =
        imageInput?.files?.[0] ||
        null;


    try {

        let logoURL =
            null;


        // =================================================
        // UPLOAD IMAGE
        // =================================================

        if (imageFile) {

            if (
                !imageFile.type.startsWith(
                    "image/"
                )
            ) {

                alert(
                    "Please select a valid image."
                );

                return;

            }


            if (
                imageFile.size >
                5 * 1024 * 1024
            ) {

                alert(
                    "The image must be smaller than 5 MB."
                );

                return;

            }


            const extension =
                getFileExtension(
                    imageFile.name
                );


            const fileName =
                `${currentUser.id}/` +
                `${Date.now()}-${randomString(8)}.` +
                extension;


            const {
                error: uploadError
            } = await db.storage
                .from("node-images")
                .upload(
                    fileName,
                    imageFile,
                    {
                        cacheControl:
                            "3600",

                        upsert:
                            false,

                        contentType:
                            imageFile.type

                    }
                );


            if (uploadError) {

                console.error(
                    "Image upload error:",
                    uploadError
                );

                alert(
                    "Could not upload the Node image: " +
                    uploadError.message
                );

                return;

            }


            const {
                data: publicURLData
            } = db.storage
                .from("node-images")
                .getPublicUrl(
                    fileName
                );


            logoURL =
                publicURLData.publicUrl;

        }


        // =================================================
        // INSERT NODE
        // =================================================

        const nodeData = {

            user_id:
                currentUser.id,

            name,

            description:
                description || null,

            city,

            country,

            upland_location:
                uplandLocation || null,

            continent,

            logo_url:
                logoURL,

            discord_url:
                discord || null,

            twitter_url:
                twitter || null,

            telegram_url:
                telegram || null,

            status:
                "pending"

        };


        const {
            data,
            error
        } = await db
            .from("nodes")
            .insert(
                nodeData
            )
            .select()
            .single();


        if (error) {

            console.error(
                "Node insert error:",
                error
            );

            alert(
                "Could not register the Node: " +
                error.message
            );

            return;

        }


        console.log(
            "Node created:",
            data
        );


        alert(
            "Node submitted successfully! It will be reviewed by the Node Hub team."
        );


        clearNodeForm();


        await loadMyNodes();


        window.location.hash =
            "dashboard";

    }

    catch (error) {

        console.error(
            "Unexpected Node registration error:",
            error
        );

        alert(
            "Unable to submit the Node."
        );

    }

}


// =====================================================
// CLEAR NODE FORM
// =====================================================

function clearNodeForm() {

    const form =
        document.getElementById(
            "node-registration-form"
        );


    if (form) {

        form.reset();

    }


    const preview =
        document.getElementById(
            "node-image-preview"
        );


    if (preview) {

        preview.innerHTML =
            "";

    }

}


// =====================================================
// REMOVE DASHBOARD
// =====================================================

function removeDashboard() {

    const dashboard =
        document.getElementById(
            "nodehub-dashboard"
        );


    if (dashboard) {

        dashboard.remove();

    }

}


// =====================================================
// LANGUAGE
// =====================================================

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


// =====================================================
// HELPERS
// =====================================================

function getValue(
    id
) {

    const element =
        document.getElementById(
            id
        );


    return element
        ? element.value.trim()
        : "";

}


function getFileExtension(
    fileName
) {

    const parts =
        fileName.split(".");


    return (
        parts.length > 1
            ? parts.pop()
                .toLowerCase()
            : "jpg"
    );

}


function randomString(
    length
) {

    const characters =
        "abcdefghijklmnopqrstuvwxyz0123456789";


    let result =
        "";


    for (
        let i = 0;
        i < length;
        i++
    ) {

        result +=
            characters.charAt(
                Math.floor(
                    Math.random() *
                    characters.length
                )
            );

    }


    return result;

}


function escapeHTML(
    value
) {

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


function safeURL(
    url
) {

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
