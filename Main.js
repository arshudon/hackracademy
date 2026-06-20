// ── TAB SWITCHING ──────────────────────────────────────────
const subLinks = document.querySelectorAll("[data-sub]");
const subPages = document.querySelectorAll(".sub-page");

subLinks.forEach(link => {
    link.addEventListener("click", function(e) {
        e.preventDefault();
        switchTab(this.dataset.sub);
        subLinks.forEach(l => l.classList.remove("active"));
        this.classList.add("active");
    });
});

function switchTab(id) {
    subPages.forEach(p => p.classList.remove("active"));

    const target = document.getElementById(id);
    if (target) {
        target.classList.add("active");

        // Update URL bookmark
        history.pushState(null, null, "#" + id);

        // Scroll to the tab content
        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }

    // Sync tab link highlight
    subLinks.forEach(l => {
        l.classList.toggle("active", l.dataset.sub === id);
    });

}

// ── HOME / ABOUT / CONTACT TOGGLE ────────────────────────────────────
const homeSection  = document.getElementById("home-section");
const aboutSection = document.getElementById("about-section");
const contactSection = document.getElementById("contact-section");

function showAbout(e) {
    if (e) e.preventDefault();
    homeSection.style.display  = "none";
    contactSection.style.display ="none";
    aboutSection.style.display = "block";
    document.getElementById("navHome").classList.remove("active");
    document.getElementById("navContact").classList.remove("active")
    document.getElementById("navAbout").classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function goHome() {
    aboutSection.style.display = "none";
    contactSection.style.display = "none";
    homeSection.style.display  = "block";
    document.getElementById("navAbout").classList.remove("active");
    document.getElementById("navContact").classList.remove("active");
    document.getElementById("navHome").classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showContact(e) {
    if (e) e.preventDefault();
    homeSection.style.display = "none";
    aboutSection.style.display = "none";
    contactSection.style.display = "block";
    document.getElementById("navHome").classList.remove("active");
    document.getElementById("navAbout").classList.remove("active")
    document.getElementById("navContact").classList.add("active");
    window.scrollTo({ top: 0, behavior: "smooth"})
}

function goToTab(tabId) {
    // If we're on About page, go back to Home first
    aboutSection.style.display = "none";
    contactSection.style.display = "none";
    homeSection.style.display = "block";

    document.getElementById("navAbout").classList.remove("active");
    document.getElementById("navContact").classList.remove("active")
    document.getElementById("navHome").classList.add("active");

    switchTab(tabId);
}

// ── HAMBURGER ─────────────────────────────────────────────
function toggleMenu() {
    document.getElementById("navLinks").classList.toggle("open");
}

document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", () => {
        document.getElementById("navLinks").classList.remove("open");
    });
});

// ── NAVBAR SCROLL ─────────────────────────────────────────
window.addEventListener("scroll", () => {
    document.getElementById("navbar").classList.toggle("scrolled", window.scrollY > 10);
});


// ── ANIMATED HEX GRID — smooth edge-travelling glow ───────
(function () {
    const canvas = document.getElementById("grid-canvas");
    const ctx    = canvas.getContext("2d");

    // ── tunables ──────────────────────────────────────────
    const HEX_R      = 28;               // hex circumradius px
    const BASE_A     = 0.05;             // resting grid line opacity
    const GLOW_R     = "0,255,204";      // teal
    const DROP_SPEED = 38;               // px per second — slow & water-like
    const TRAIL_LEN  = 260;              // px of trail behind the head
    const NUM_DROPS  = 3;               // simultaneous glows
    const HEAD_A     = 0.82;            // peak alpha at the glow head
    const GLOW_W     = 10;              // blur spread of the head glow (shadow)

    // ── grid data ─────────────────────────────────────────
    // vertices: array of {x,y}
    // edges: array of {a, b} indices into vertices
    let verts = [];
    let edges = [];
    let adjVerts = {}; // vertIdx -> [vertIdx, ...]

    function buildGrid() {
        verts  = [];
        edges  = [];
        adjVerts = {};

        const W  = canvas.width;
        const H  = canvas.height;
        const rw = HEX_R * Math.sqrt(3);
        const rh = HEX_R * 2;

        const cols = Math.ceil(W / rw) + 3;
        const rows = Math.ceil(H / (rh * 0.75)) + 3;

        const vKey  = (x, y) => `${Math.round(x)},${Math.round(y)}`;
        const vIdx  = {};

        function getOrAdd(x, y) {
            const k = vKey(x, y);
            if (vIdx[k] !== undefined) return vIdx[k];
            const i = verts.length;
            verts.push({ x, y });
            vIdx[k] = i;
            adjVerts[i] = [];
            return i;
        }

        function addEdge(ia, ib) {
            // deduplicate
            if (!adjVerts[ia].includes(ib)) {
                adjVerts[ia].push(ib);
                adjVerts[ib].push(ia);
                edges.push({ a: ia, b: ib });
            }
        }

        for (let col = -1; col < cols; col++) {
            for (let row = -1; row < rows; row++) {
                const cx = col * rw + (row % 2 === 0 ? 0 : rw / 2);
                const cy = row * rh * 0.75;
                // 6 corners
                const corners = [];
                for (let k = 0; k < 6; k++) {
                    const angle = Math.PI / 180 * (60 * k - 30);
                    const vx = cx + HEX_R * Math.cos(angle);
                    const vy = cy + HEX_R * Math.sin(angle);
                    corners.push(getOrAdd(vx, vy));
                }
                for (let k = 0; k < 6; k++) {
                    addEdge(corners[k], corners[(k + 1) % 6]);
                }
            }
        }
    }

    // ── drop: travels along edges continuously ─────────────
    // A drop is positioned as a float distance along a sequence
    // of edges (waypoints). We pre-plan a long path of vertices
    // so it can always keep moving.

    const drops = [];

    function randomVert() {
        return Math.floor(Math.random() * verts.length);
    }

    function spawnDrop() {
        // pick a starting vertex roughly on-screen
        const onscreen = verts
            .map((v, i) => ({ v, i }))
            .filter(({ v }) =>
                v.x > 0 && v.x < canvas.width &&
                v.y > 0 && v.y < canvas.height
            );
        if (!onscreen.length) return;

        const start = onscreen[Math.floor(Math.random() * onscreen.length)].i;

        // pre-build a long wandering path of vertices
        const path    = [start];
        const visited = new Set([start]);
        let   cur     = start;

        for (let step = 0; step < 120; step++) {
            const nbrs = (adjVerts[cur] || []).filter(n => !visited.has(n));
            if (!nbrs.length) break;
            const next = nbrs[Math.floor(Math.random() * nbrs.length)];
            path.push(next);
            visited.add(next);
            cur = next;
        }

        if (path.length < 4) return; // too short

        drops.push({
            path,               // array of vertex indices
            seg:    0,          // current segment index (path[seg] -> path[seg+1])
            t:      0,          // 0..1 progress along current segment
            dist:   0,          // total px travelled
            // trail: array of {x,y} world positions, newest last
            trail:  [],
        });
    }

    // ── draw the base grid ────────────────────────────────
    function drawGrid() {
        ctx.lineWidth   = 1;
        ctx.strokeStyle = `rgba(${GLOW_R},${BASE_A})`;
        ctx.beginPath();
        for (const e of edges) {
            const a = verts[e.a], b = verts[e.b];
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
        }
        ctx.stroke();
    }

    // ── draw one drop + its trail ─────────────────────────
    function drawDrop(drop) {
        const trail = drop.trail;
        if (trail.length < 2) return;

        // draw trail as a stroked path fading from transparent → bright
        for (let i = 1; i < trail.length; i++) {
            const frac = i / trail.length;           // 0 = tail, 1 = head
            // ease: slow fade in, quick bright near head
            const alpha = HEAD_A * Math.pow(frac, 2.2);

            ctx.beginPath();
            ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
            ctx.lineTo(trail[i].x,     trail[i].y);
            ctx.strokeStyle = `rgba(${GLOW_R},${alpha})`;
            ctx.lineWidth   = 1 + frac * 1.5;       // thickens toward head
            ctx.stroke();
        }

        // head glow — radial bloom at the current position
        const head = trail[trail.length - 1];
        const grad = ctx.createRadialGradient(
            head.x, head.y, 0,
            head.x, head.y, GLOW_W * 2
        );
        grad.addColorStop(0,   `rgba(${GLOW_R},0.45)`);
        grad.addColorStop(0.4, `rgba(${GLOW_R},0.12)`);
        grad.addColorStop(1,   `rgba(${GLOW_R},0)`);

        ctx.beginPath();
        ctx.arc(head.x, head.y, GLOW_W * 2, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
    }

    // ── main loop ─────────────────────────────────────────
    let lastTs = 0;

    function loop(ts) {
        const dt = Math.min((ts - lastTs) / 1000, 0.05); // seconds, capped
        lastTs = ts;

        // handle resize
        if (canvas.width  !== window.innerWidth ||
            canvas.height !== window.innerHeight) {
            canvas.width  = window.innerWidth;
            canvas.height = window.innerHeight;
            buildGrid();
            drops.length = 0;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();

        // spawn drops if needed
        while (drops.length < NUM_DROPS) spawnDrop();

        const pxThisFrame = DROP_SPEED * dt;

        for (let di = drops.length - 1; di >= 0; di--) {
            const d = drops[di];

            // advance drop along path
            let remaining = pxThisFrame;

            while (remaining > 0 && d.seg < d.path.length - 1) {
                const va = verts[d.path[d.seg]];
                const vb = verts[d.path[d.seg + 1]];
                const dx = vb.x - va.x;
                const dy = vb.y - va.y;
                const segLen = Math.sqrt(dx * dx + dy * dy);
                const leftOnSeg = (1 - d.t) * segLen;

                if (remaining >= leftOnSeg) {
                    // move to next segment
                    remaining -= leftOnSeg;
                    d.seg++;
                    d.t = 0;
                } else {
                    d.t += remaining / segLen;
                    remaining = 0;
                }
            }

            // compute head world position
            if (d.seg >= d.path.length - 1) {
                // reached end of planned path — respawn
                drops.splice(di, 1);
                continue;
            }

            const va   = verts[d.path[d.seg]];
            const vb   = verts[d.path[d.seg + 1]];
            const hx   = va.x + (vb.x - va.x) * d.t;
            const hy   = va.y + (vb.y - va.y) * d.t;

            d.dist += pxThisFrame;

            // push head to trail
            d.trail.push({ x: hx, y: hy });

            // trim trail to TRAIL_LEN px
            // estimate by removing oldest points until total length ≤ TRAIL_LEN
            while (d.trail.length > 2) {
                const dx0 = d.trail[1].x - d.trail[0].x;
                const dy0 = d.trail[1].y - d.trail[0].y;
                const trailPx = Math.sqrt(dx0 * dx0 + dy0 * dy0);
                // compute rough total trail length
                let total = 0;
                for (let k = 1; k < d.trail.length; k++) {
                    const dx1 = d.trail[k].x - d.trail[k-1].x;
                    const dy1 = d.trail[k].y - d.trail[k-1].y;
                    total += Math.sqrt(dx1*dx1 + dy1*dy1);
                }
                if (total > TRAIL_LEN) d.trail.shift();
                else break;
            }

            drawDrop(d);
        }

        requestAnimationFrame(loop);
    }

    // ── init ──────────────────────────────────────────────
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    buildGrid();
    window.addEventListener("resize", () => {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        buildGrid();
        drops.length = 0;
    });
    requestAnimationFrame(loop);
})();

//___________sorting logic______________________________________
//___________sorting & filtering logic______________________________________
document.addEventListener("DOMContentLoaded", function () {
    const articleSort = document.getElementById("article-sort");
    const articleContainer = document.getElementById("article-container");

    if (articleSort && articleContainer) {
        articleSort.addEventListener("change", function () {
            const cards = Array.from(articleContainer.querySelectorAll(".article-card"));
            const mode = this.value;

            if (mode === "beginner") {
                // FILTER: show only level 1 cards, hide the rest
                cards.forEach(card => {
                    const isBeginner = card.dataset.level === "1";
                    card.style.display = isBeginner ? "" : "none";
                });
                // sort the visible ones by latest date
                cards
                    .filter(card => card.dataset.level === "1")
                    .sort((a, b) => new Date(b.dataset.date) - new Date(a.dataset.date))
                    .forEach(card => articleContainer.appendChild(card));

            } else {
                // LATEST / OLDEST: show all cards again
                cards.forEach(card => { card.style.display = ""; });

                cards.sort((a, b) => {
                    if (mode === "latest") {
                        return new Date(b.dataset.date) - new Date(a.dataset.date);
                    }
                    if (mode === "oldest") {
                        return new Date(a.dataset.date) - new Date(b.dataset.date);
                    }
                    return 0;
                });
                cards.forEach(card => articleContainer.appendChild(card));
            }
        });
    } else {
        console.warn("Sort elements not found:", articleSort, articleContainer);
    }
});

//_________________contact-us comment box logic ____________________________
const contactForm = document.getElementById("contact-form");
if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const name = document.getElementById("contact-name").value;
        const email = document.getElementById("contact-email").value;
        const message = document.getElementById("contact-message").value;

        const subject = encodeURIComponent(`Message from ${name}`);
        const body = encodeURIComponent(`From: ${name} (${email})\n\n${message}`);

        window.location.href = `mailto:contact@hackracademy.com?subject=${subject}&body=${body}`;
    });
}