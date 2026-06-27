// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function () {
    // Interactive background (neural links + mouse light + ripples)
    (function setupInteractiveBackground() {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const canvas = document.getElementById('bg-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        // Clamp device pixel ratio to reduce GPU work on Retina screens
        let width = 0, height = 0, dpr = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
        function resize() {
            const rect = canvas.getBoundingClientRect();
            width = Math.round(rect.width);
            height = Math.round(rect.height);
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        resize();
        window.addEventListener('resize', resize);

        // Colors from CSS variables
        function hexToRgb(hex) {
            const m = hex.trim().replace('#', '').match(/.{1,2}/g);
            if (!m) return { r: 35, g: 174, b: 179 };
            const [r, g, b] = m.map(x => parseInt(x, 16));
            return { r, g, b };
        }
        const primaryHex = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#23aeb3';
        const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--accent-color') || '#02385c';
        const { r: pr, g: pg, b: pb } = hexToRgb(primaryHex);
        const { r: ar, g: ag, b: ab } = hexToRgb(accentHex);

        // Particles (neural nodes)
        const particles = [];
        const area = width * height;
        const count = prefersReducedMotion ? 0 : 200; // fixed 200 nodes as requested
        const linkDist = 100; // tighter link distance to limit line count

        function rand(min, max) { return Math.random() * (max - min) + min; }
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: rand(-0.4, 0.4),
                vy: rand(-0.4, 0.4),
                r: rand(1.1, 2.0)
            });
        }

        const mouse = { x: width / 2, y: height / 2, active: false };

        function onMove(e) {
            const rect = canvas.getBoundingClientRect();
            mouse.x = (e.clientX - rect.left);
            mouse.y = (e.clientY - rect.top);
            mouse.active = true;
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseleave', () => { mouse.active = false; });

        let lastT = performance.now();
        let lastDraw = 0; // 30 FPS cap
        function tick(t) {
            // Limit to ~30 FPS for smoother performance on laptops
            if (t - lastDraw < 33) { requestAnimationFrame(tick); return; }
            lastDraw = t;
            const dt = Math.min(33, t - lastT); // cap delta
            lastT = t;
            ctx.clearRect(0, 0, width, height);

            // Optional global fade (disabled for performance)
            // ctx.fillStyle = 'rgba(10,10,10,0.03)';
            // ctx.fillRect(0,0,width,height);

            // Update + draw particles
            for (let p of particles) {
                // Mild attraction to mouse
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const d2 = dx * dx + dy * dy;
                const d = Math.sqrt(d2) || 1;
                const influence = mouse.active ? Math.min(0.10, 24 / d2) : 0.012;
                p.vx += (dx / d) * influence;
                p.vy += (dy / d) * influence;

                // Move
                p.x += p.vx * (dt / 16);
                p.y += p.vy * (dt / 16);
                // Friction
                p.vx *= 0.970;
                p.vy *= 0.970;
                // Wrap edges
                if (p.x < -10) p.x = width + 10; else if (p.x > width + 10) p.x = -10;
                if (p.y < -10) p.y = height + 10; else if (p.y > height + 10) p.y = -10;

                // Node
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${pr},${pg},${pb},0.6)`;
                ctx.fill();
            }

            // Links
            for (let i = 0; i < particles.length; i++) {
                const a = particles[i];
                for (let j = i + 1; j < particles.length; j++) {
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const d = Math.hypot(dx, dy);
                    if (d < linkDist) {
                        let alpha = (1 - d / linkDist) * 0.4;
                        // Boost near mouse
                        const mdx = (a.x + b.x) / 2 - mouse.x;
                        const mdy = (a.y + b.y) / 2 - mouse.y;
                        const md = Math.hypot(mdx, mdy);
                        alpha += Math.max(0, 0.1 - md / 900);
                        ctx.strokeStyle = `rgba(${ar},${ag},${ab},${Math.min(0.6, Math.max(0, alpha))})`;
                        ctx.lineWidth = 0.8;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
            }

            // Mouse spotlight
            if (mouse.active) {
                const maxR = Math.max(420, Math.min(560, Math.sqrt(width * height) * 0.18));
                const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, maxR);
                grad.addColorStop(0.0, `rgba(${pr},${pg},${pb},0.08)`);
                grad.addColorStop(0.35, `rgba(${pr},${pg},${pb},0.01)`);
                grad.addColorStop(1.0, 'rgba(0,0,0,0)');
                // Clip to a region to avoid full-canvas overdraw
                ctx.save();
                ctx.beginPath();
                ctx.arc(mouse.x, mouse.y, maxR, 0, Math.PI * 2);
                ctx.clip();
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = grad;
                ctx.fillRect(mouse.x - maxR, mouse.y - maxR, maxR * 2, maxR * 2);
                ctx.restore();
            }

            // Ripple effect removed per request

            if (!prefersReducedMotion) requestAnimationFrame(tick);
        }

        if (!prefersReducedMotion) requestAnimationFrame(tick);
    })();
    // Internationalization (EN/FR)
    const i18n = {
        en: {},
        fr: {
            'page.title': 'Portfolio de Victor',
            'nav.home': 'Accueil',
            'nav.about': 'À propos',
            'nav.now': 'Maintenant',
            'nav.publications': 'Publications',
            'nav.projects': 'Projets',
            'nav.creations': 'Créations',
            'nav.detector': 'Détecteur',
            'nav.contact': 'Contact',
            'hero.title': "<span class=\"highlight\">Victor Livernoche</span> | Doctorant à Mila",
            'hero.subtitle': "Mon nom est Victor, doctorant né à Montréal à l’Université McGill et à Mila, sous la supervision de la professeure Reihaneh Rabbany. En dehors de mes recherches, j’aime faire du sport, m’entraîner et créer de la musique. Sur le plan académique, mes travaux portent sur la modélisation générative, la détection d’anomalies et de deepfakes, ainsi que l’apprentissage sur graphes temporels. Je m’intéresse particulièrement à l'amélioration de l'efficacité des systèmes génératifs à grande échelle et à la conception de modèles et de jeux de données qui rendent l’IA plus fiable et socialement bénéfique.",
            'hero.cv': 'Télécharger le CV',
            'hero.contact': 'Contactez‑moi',
            'hero.img_alt': 'Portrait de Victor Livernoche',
            'now.title': 'Maintenant',
            'now.research.text': `
                        <li>Finalisation de la justification théorique d'un article sur la sélection de bruit guidée par la kurtosis pour le score-matching de débruitage en détection d'anomalies tabulaires. L'idée centrale s'appuie sur mes travaux antérieurs sur l'estimation du temps de diffusion.</li>
                        <li>Exploration d'une direction de diffusion dans l'espace des étiquettes et d'une estimation d'incertitude pour le scoring de réalisme dans la détection de deepfakes, les deux encore en phase préliminaire.</li>
                        <li>Auxiliaire d'enseignement pour COMP 511 à McGill en ce moment, ce qui implique la gestion des soumissions de propositions de projets et la révision par les pairs via OpenReview.</li>
                        <li>En parallèle, démarrage d'un projet sur les signaux de provenance d'images générées par IA, et réflexion sur une direction de recherche sur les deepfakes politiques faisant suite aux travaux autour de l'élection fédérale canadienne de 2025.</li>`,
            'now.location.text': 'Montréal, QC',
            'now.updated': 'Dernière mise à jour : 26 mars 2026',
            'about.title': 'À propos de moi',
            'about.education': 'Formation',
            'edu.phd_title': 'Doctorat, Informatique',
            'edu.phd_meta': 'Université McGill • Sept 2024 – Août 2028 • Moyenne : 4.0/4.0',
            'edu.phd_desc': 'Recherche en apprentissage automatique sous la direction de la prof. Reihaneh Rabbany.',
            'edu.msc_title': 'M.Sc. (Mémoire), Informatique',
            'edu.msc_meta': 'Université McGill • Sept 2022 – Août 2024 • Moyenne : 4.0/4.0',
            'edu.msc_desc': 'Recherche en apprentissage automatique sous la direction du prof. Siamak Ravanbakhsh.',
            'edu.msc_thesis': 'Mémoire',
            'edu.bsc_title': 'B.Sc., Honours en informatique (mineure en physique)',
            'edu.bsc_meta': 'Université McGill • Sept 2019 – Mai 2022 • Moyenne : 3.89/4.0',
            'about.experience': 'Expérience',
            'exp.mila_student_title': 'Étudiant chercheur scientifique',
            'exp.mila_student_meta': 'Mila – Institut québécois d’IA, Montréal • Sept 2022 – Présent',
            'exp.mila_student_desc': "Focalisé sur les modèles de diffusion et la détection d'anomalies; développé une nouvelle méthode de détection d'anomalies basée sur les modèles de diffusion. Application à des anomalies d'étoiles galactiques. Membre du comité de santé mentale de Mila.",
            'exp.mila_intern_title': 'Stagiaire en recherche',
            'exp.mila_intern_meta': 'Mila – Institut québécois d’IA, Montréal • Mai 2022 – Août 2022',
            'exp.mila_intern_desc': "Paramétrisation de l'environnement d'apprentissage par renforcement BabyAI dans le groupe du prof. Yoshua Bengio.",
            'exp.ugra_title': 'Assistant de recherche (1er cycle)',
            'exp.ugra_meta': 'Université McGill, Montréal • Mai 2021 – Juin 2021',
            'exp.ugra_desc': 'Analyse de méthodes de compactage de données dans de grandes bases de données (avec la prof. Oana Balmau).',
            'exp.tech3_title': 'Stagiaire en recherche',
            'exp.tech3_meta': 'Tech3Lab, HEC Montréal • Mai 2019 – Août 2019',
            'exp.tech3_desc': 'Soutien aux opérations de recherche (tâches admin, simulations, financement, communications partenaires) avec le prof. Pierre‑Majorique Léger.',
            'about.interests': 'Intérêts de recherche',
            'interests.1': 'Modélisation générative pour les images et la génération multimodale',
            'interests.2': 'Modèles génératifs à base d’énergie (théorie et applications)',
            'interests.3': 'Détection de deepfakes contre la désinformation',
            'interests.4': 'Apprentissage de représentations sur graphes temporels',
            'interests.5': 'Détection d’anomalies',
            'about.skills': 'Compétences',
            'skills.dl': 'Apprentissage profond',
            'skills.diffusion': 'Modèles de diffusion',
            'skills.temporal': 'Graphes temporels',
            'skills.python': 'Python',
            'skills.pytorch': 'PyTorch',
            'pubs.title': 'Publications',
            'pubs.kdsm_meta': 'Prépublication arXiv • 2026',
            'pubs.kdsm_abs': "Nous introduisons K-DSM, une méthode de score matching débruité qui fixe les niveaux de bruit par variable à partir de la kurtose marginale pour la détection d’anomalies tabulaires. Cette mise à l’échelle adaptative améliore la couverture de densité sans ajouter de complexité au modèle, avec de solides résultats en semi-supervisé et une performance robuste en non supervisé lorsqu’elle est combinée à un filtrage léger par enseignant EMA.",
            'pubs.openfake_meta': 'En évaluation',
            'pubs.openfake_abs': "OpenFake est un benchmark axé sur le politique pour la détection de deepfakes modernes. Il associe ~3 M d’images réelles avec légendes à 963 k d’images synthétiques de haute qualité issues de générateurs propriétaires et open source, cartographie les modalités de désinformation observées sur les réseaux sociaux et inclut une étude de perception montrant que les modèles propriétaires récents sont difficiles à distinguer. Une plateforme participative adversariale ajoute en continu des cas difficiles pour maintenir la robustesse des détecteurs. Globalement, nos résultats apportent des éléments encourageants montrant que des détecteurs entraînés sur des données de haute qualité peuvent se généraliser à des distributions réelles issues des réseaux sociaux.",
            'pubs.deepfakes_meta': 'Dans les Actes de la conférence ACM Web 2026',
            "pubs.deepfakes_abs": "Nous analysons les deepfakes visuels lors de l’élection fédérale canadienne de 2025 à partir de 187 778 publications sur X, Bluesky et Reddit. Nous constatons que 5,86 % des images liées à l’élection étaient synthétiques, avec une prévalence plus élevée chez les comptes de droite (8,66 % contre 4,42 %). La majorité des deepfakes étaient bénins et les contenus nuisibles ont eu une portée limitée (0,12 % des vues sur X). Toutefois, les fabrications les plus réalistes ont suscité un engagement disproportionné.",
            'pubs.preprint': 'Prépublication',
            'pubs.paper': 'Article',
            'pubs.diffusion_meta': 'ICLR 2024 • Spotlight (Top 5%)',
            'pubs.diffusion_abs': "Ce travail explore l'utilisation des modèles de diffusion pour la détection d’anomalies en mode non supervisé et semi-supervisé. Il introduit une alternative plus simple et rapide au DDPM, appelée estimation du temps de diffusion (DTE), qui estime une densité temporelle pour scorer les anomalies. DTE est plus rapide que DDPM et atteint les meilleurs résultats sur ADBench, montrant que les méthodes de diffusion sont compétitives et évolutives.",
            'pubs.prompt_meta': 'ML Reproducibility Challenge 2022 • ReScience C 9.2 (#33) • 2023',
            'pubs.prompt_abs': "Nous reproduisons et étendons AMuLaP, une méthode de labellisation automatique pour la classification en few-shot. Nous validons les résultats originaux sur 3 tâches GLUE et testons sur 2 nouveaux jeux de données. Malgré certaines difficultés techniques, la méthode est reproductible, efficace et prometteuse pour des applications NLP plus larges.",
            'projects.title': 'Autres projets',
            'creations.title': 'Créations',
            'creations.recipes.title': 'Collection de recettes',
            'creations.recipes.desc': "Mes propres recettes dans une galerie avec recherche, filtres, ajustement des portions et conversion d'unités.",
            'creations.music.title': 'Musique',
            'creations.music.desc': "Une galerie musicale présentant mes pistes originales.",
            'creations.detector.title': 'Détecteur de deepfakes',
            'creations.detector.desc': "Téléversez une image ou une vidéo et obtenez un score de génération par IA ou de falsification grâce à mon détecteur OpenFake, avec masques de localisation et chronologie image par image.",
            'projects.code': 'Code',
            'projects.demo': 'Démo',
            'projects.nnfs.title': 'Réseau de neurones from scratch',
            'projects.nnfs.desc': 'Notebook Jupyter implémentant un réseau de neurones from scratch avec NumPy.',
            'projects.recipes.title': 'Collection de recettes',
            'projects.recipes.desc': "Mes propres recettes dans une galerie avec recherche, filtres, ajustement des portions et conversion d'unités.",
            'projects.music.title': 'Musique',
            'projects.music.desc': "Une galerie musicale présentant mes pistes originales.",
            'projects.visit': 'Visiter',
            'projects.mldash.title': 'Tableau de bord de recherche ML',
            'projects.mldash.desc': 'Tableau de bord interactif pour visualiser des expériences d’apprentissage automatique et des résultats sur graphes temporels.',
            'contact.title': 'Me contacter',
            'contact.body': "Je suis toujours ouvert à discuter d'opportunités de recherche, de collaborations ou de projets innovants en apprentissage automatique.",
            'contact.send': 'Envoyer un e‑mail',
            'contact.cv': 'Télécharger le CV',
            'footer.copy': '© 2026 Victor. Tous droits réservés.'
        }
    };

    // Auto-extract English from the DOM as the source of truth
    if (document.title) i18n.en['page.title'] = document.title;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            i18n.en[key] = el.innerHTML;
        }
    });

    const portrait = document.getElementById('hero-portrait');
    if (portrait && portrait.alt) {
        i18n.en['hero.img_alt'] = portrait.alt;
    }

    function getDefaultLang() {
        const saved = localStorage.getItem('lang');
        if (saved === 'en' || saved === 'fr') return saved;
        return (navigator.language || navigator.userLanguage || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
    }

    function applyTranslations(lang) {
        document.documentElement.setAttribute('lang', lang);
        // Title
        document.title = i18n[lang]['page.title'];
        // Elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = i18n[lang][key];
            if (typeof val === 'string') {
                // Use innerHTML to allow markup in some strings
                el.innerHTML = val;
            }
        });
        // Image alt text
        const portrait = document.getElementById('hero-portrait');
        if (portrait) portrait.alt = i18n[lang]['hero.img_alt'];
        // Toggle button label
        const toggle = document.getElementById('lang-toggle');
        if (toggle) toggle.textContent = lang === 'en' ? 'FR' : 'EN';
    }

    function setLang(lang) {
        const normalized = lang === 'fr' ? 'fr' : 'en';
        localStorage.setItem('lang', normalized);
        applyTranslations(normalized);
    }

    const initialLang = getDefaultLang();
    setLang(initialLang);
    const toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            const current = localStorage.getItem('lang') || initialLang;
            setLang(current === 'en' ? 'fr' : 'en');
        });
    }
    // Handle navigation scroll behavior
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();

            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80; // Account for fixed navbar

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    let lastScrollTop = 0;

    window.addEventListener('scroll', function () {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        const isLight = document.body.classList.contains('light-mode');
        if (scrollTop > 100) {
            navbar.style.background = isLight ? 'rgba(250, 247, 242, 0.97)' : 'rgba(10, 10, 10, 0.95)';
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
        } else {
            navbar.style.background = isLight ? 'rgba(250, 247, 242, 0.92)' : 'rgba(10, 10, 10, 0.9)';
            navbar.style.boxShadow = 'none';
        }

        lastScrollTop = scrollTop;
    });

    // Add active state to navigation links based on scroll position
    const sections = document.querySelectorAll('section[id]');

    function updateActiveNavLink() {
        const scrollPosition = window.scrollY + 100;

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            const sectionId = section.getAttribute('id');
            const navLink = document.querySelector(`.nav-links a[href="#${sectionId}"]`);

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                // Remove active class from all nav links
                navLinks.forEach(link => link.classList.remove('active'));
                // Add active class to current nav link
                if (navLink) {
                    navLink.classList.add('active');
                }
            }
        });
    }

    window.addEventListener('scroll', updateActiveNavLink);

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe elements for animation
    const animatedElements = document.querySelectorAll('.cv-item, .publication-card, .project-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Dynamic typing effect for hero subtitle (optional enhancement)
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const originalText = heroSubtitle.textContent;

    function typeWriter(text, element, speed = 50) {
        element.textContent = '';
        let i = 0;

        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }

        type();
    }

    // Uncomment the line below to enable typing effect
    // typeWriter(originalText, heroSubtitle, 30);

    // Contact form handling (if needed later)
    const contactButtons = document.querySelectorAll('a[href^="mailto:"]');
    contactButtons.forEach(button => {
        button.addEventListener('click', function () {
            // Track contact button clicks for analytics
            console.log('Contact button clicked');
        });
    });

    // CV download tracking
    const cvButtons = document.querySelectorAll('a[href="/cv"]');
    cvButtons.forEach(button => {
        button.addEventListener('click', function () {
            // Track CV downloads for analytics
            console.log('CV download initiated');
        });
    });

    // Add loading state to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function () {
            const originalText = this.innerHTML;

            // Don't add loading state for download and mailto links
            if (this.hasAttribute('download') || this.href.startsWith('mailto:')) {
                return;
            }

            this.style.opacity = '0.7';
            setTimeout(() => {
                this.style.opacity = '1';
            }, 300);
        });
    });

    // Parallax effect for background (subtle)
    window.addEventListener('scroll', function () {
        const scrolled = window.pageYOffset;
        const background = document.querySelector('.animated-background');
        const rate = scrolled * -0.5;

        background.style.transform = `translateY(${rate}px)`;
    });

    // =========================================
    // Dark / Light Mode Toggle
    // =========================================
    const themeToggleBtn = document.getElementById('theme-toggle');
    const blobContainer = document.createElement('div');
    blobContainer.id = 'light-blobs';
    blobContainer.innerHTML = `
        <div class="light-blob light-blob-1"></div>
        <div class="light-blob light-blob-2"></div>
        <div class="light-blob light-blob-3"></div>
    `;

    function applyTheme(mode) {
        if (mode === 'light') {
            document.body.classList.add('light-mode');
            if (!document.getElementById('light-blobs')) {
                document.body.appendChild(blobContainer);
            }
            if (themeToggleBtn) {
                themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
            }
        } else {
            document.body.classList.remove('light-mode');
            const blobs = document.getElementById('light-blobs');
            if (blobs) blobs.remove();
            if (themeToggleBtn) {
                themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
            }
        }
        localStorage.setItem('theme', mode);
        // Re-apply navbar background in case user toggles theme while scrolled
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const isLight = mode === 'light';
        if (scrollTop > 100) {
            navbar.style.background = isLight ? 'rgba(250, 247, 242, 0.97)' : 'rgba(10, 10, 10, 0.95)';
        } else {
            navbar.style.background = isLight ? 'rgba(250, 247, 242, 0.92)' : 'rgba(10, 10, 10, 0.9)';
        }
    }

    // Initialize theme from saved preference (default: dark)
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const current = document.body.classList.contains('light-mode') ? 'light' : 'dark';
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });
    }

});
