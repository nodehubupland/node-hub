```javascript
// =============================================
// NODE HUB
// Supabase + Frontend + Authentication
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
let currentUser = null;


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

        await initializeAuth();

        await loadNodes();

        setupSearch();

        setupLanguage();

        setupAuthForms();

        setupLogout();

        setupNavigation();

    }
);


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

        } else {

            link.textContent =
                "Sign in";

        }

    });


    const accountStatus =
        document.getElementById(
            "account-status"
        );

    if (accountStatus) {

        if (currentUser) {

            accountStatus.textContent =
                currentUser.email || "Signed in";

        } else {

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


    if (!emailInput || !passwordInput) {

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


    if (!emailInput || !passwordInput) {

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

            email: email,

            password: password

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


        setTimeout(
            () => {

                updateDashboard();

            },
            100
        );

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


        currentUser = null;

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
// LOGOUT EVENT
// =============================================

function setupLogout() {

    const logoutButtons =
        document.querySelectorAll(
            "[data-action='logout']"
        );


    logoutButtons.forEach(button => {

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

    document.addEventListener(
        "click",
        event => {

            const link =
                event.target.closest(
                    "a[href^='#']"
                );


            if (!link) {
                return;
            }


            const href =
                link.getAttribute(
                    "href"
                );


            if (
                href === "#dashboard" ||
                href === "#submit"
            ) {

                if (!currentUser) {

                    event.preventDefault();

                    window.location.hash =
                        "login";

                    return;

                }

            }


            if (
                href === "#dashboard"
            ) {

                setTimeout(
                    updateDashboard,
                    100
                );

            }

        }
    );

}


// =============================================
// DASHBOARD
// =============================================

async function updateDashboard() {

    if (!currentUser) {
        return;
    }


    const emailElement =
        document.getElementById(
            "dashboard-email"
        );


    if (emailElement) {

        emailElement.textContent =
            currentUser.email || "";

    }


    const usernameElement =
        document.getElementById(
            "dashboard-username"
        );


    if (usernameElement) {

        usernameElement.textContent =
            currentUser.user_metadata?.username ||
            currentUser.email?.split("@")[0] ||
            "User";

    }


    await loadMyNodes();

}


// =============================================
// LOAD MY NODES
// =============================================

async function loadMyNodes() {

    if (!currentUser) {
        return;
    }


    const {
        data,
        error
    } = await db
        .from("nodes")
        .select("*")
        .eq(
            "owner_id",
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
            "Error loading my Nodes:",
            error
        );

        return;

    }


    const container =
        document.getElementById(
            "my-nodes"
        );


    if (!container) {
        return;
    }


    if (!data || !data.length) {

        container.innerHTML = `
            <p>
                No Nodes registered yet.
            </p>
        `;

        return;

    }


    container.innerHTML =
        data.map(node => {

            return `
                <div class="my-node">

                    <strong>
                        ${escapeHTML(
                            node.name || "Unnamed Node"
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            node.status || "pending"
                        )}
                    </span>

                </div>
            `;

        }).join("");

}


// =============================================
// REGISTER NODE
// =============================================

async function submitNode() {

    if (!currentUser) {

        alert(
            "Please sign in before registering a Node."
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
        !description ||
        !city ||
        !country ||
        !continent
    ) {

        alert(
            "Please complete all required fields."
        );

        return;

    }


    const fileInput =
        document.getElementById(
            "node-logo"
        );


    let logoURL = "";


    // =============================================
    // UPLOAD LOGO
    // =============================================

    if (
        fileInput &&
        fileInput.files &&
        fileInput.files.length
    ) {

        const file =
            fileInput.files[0];


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            alert(
                "Please select an image file."
            );

            return;

        }


        const maxSize =
            5 * 1024 * 1024;


        if (file.size > maxSize) {

            alert(
                "The image must be smaller than 5 MB."
            );

            return;

        }


        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();


        const fileName =
            `${currentUser.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;


        const {
            error: uploadError
        } = await db.storage
            .from("node-images")
            .upload(
                fileName,
                file,
                {
                    cacheControl:
                        "3600",

                    upsert:
                        false,

                    contentType:
                        file.type

                }
            );


        if (uploadError) {

            console.error(
                "Image upload error:",
                uploadError
            );

            alert(
                "Unable to upload the Node logo: " +
                uploadError.message
            );

            return;

        }


        const {
            data: publicData
        } = db.storage
            .from("node-images")
            .getPublicUrl(
                fileName
            );


        logoURL =
            publicData.publicUrl;

    }


    // =============================================
    // INSERT NODE
    // =============================================

    const {
        data,
        error
    } = await db
        .from("nodes")
        .insert({

            owner_id:
                currentUser.id,

            name:
                name,

            description:
                description,

            city:
                city,

            country:
                country,

            continent:
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

        })
        .select()
        .single();


    if (error) {

        console.error(
            "Node registration error:",
            error
        );

        alert(
            "Unable to register the Node: " +
            error.message
        );

        return;

    }


    console.log(
        "Node created:",
        data
    );


    alert(
        "Node submitted successfully. It is now waiting for review."
    );


    clearNodeForm();

    await loadMyNodes();

    window.location.hash =
        "dashboard";

}


// =============================================
// NODE FORM EVENTS
// =============================================

function setupNodeForm() {

    const form =
        document.getElementById(
            "node-form"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        event => {

            event.preventDefault();

            submitNode();

        }
    );


    const fileInput =
        document.getElementById(
            "node-logo"
        );


    const preview =
        document.getElementById(
            "node-logo-preview"
        );


    if (
        fileInput &&
        preview
    ) {

        fileInput.addEventListener(
            "change",
            () => {

                const file =
                    fileInput.files[0];


                if (!file) {

                    preview.innerHTML =
                        "";

                    return;

                }


                if (
                    !file.type.startsWith(
                        "image/"
                    )
                ) {

                    alert(
                        "Please select an image file."
                    );

                    fileInput.value =
                        "";

                    preview.innerHTML =
                        "";

                    return;

                }


                const reader =
                    new FileReader();


                reader.onload =
                    event => {

                        preview.innerHTML = `
                            <img
                                src="${event.target.result}"
                                alt="Node logo preview"
                                style="
                                    max-width:180px;
                                    max-height:180px;
                                    object-fit:contain;
                                    border-radius:12px;
                                "
                            >
                        `;

                    };


                reader.readAsDataURL(
                    file
                );

            }
        );

    }

}


// =============================================
// CLEAR NODE FORM
// =============================================

function clearNodeForm() {

    const form =
        document.getElementById(
            "node-form"
        );


    if (form) {

        form.reset();

    }


    const preview =
        document.getElementById(
            "node-logo-preview"
        );


    if (preview) {

        preview.innerHTML =
            "";

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
// GET VALUE
// =============================================

function getValue(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return "";
    }


    return element.value.trim();

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


// =============================================
// START NODE FORM
// =============================================

setTimeout(
    () => {

        setupNodeForm();

        updateDashboard();

    },
    300
);
```
