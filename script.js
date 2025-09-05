// Smooth scrolling for navigation links
document.addEventListener('DOMContentLoaded', function() {
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
            const m = hex.trim().replace('#','').match(/.{1,2}/g);
            if (!m) return {r:35,g:174,b:179};
            const [r,g,b] = m.map(x => parseInt(x,16));
            return {r,g,b};
        }
        const primaryHex = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#23aeb3';
        const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--accent-color') || '#02385c';
        const {r:pr, g:pg, b:pb} = hexToRgb(primaryHex);
        const {r:ar, g:ag, b:ab} = hexToRgb(accentHex);

        // Particles (neural nodes)
        const particles = [];
        const area = width * height;
        const count = prefersReducedMotion ? 0 : 200; // fixed 200 nodes as requested
        const linkDist = 100; // tighter link distance to limit line count

        function rand(min, max){ return Math.random()*(max-min)+min; }
        for (let i=0;i<count;i++){
            particles.push({
                x: Math.random()*width,
                y: Math.random()*height,
                vx: rand(-0.4,0.4),
                vy: rand(-0.4,0.4),
                r: rand(1.1, 2.0)
            });
        }

        const mouse = { x: width/2, y: height/2, active: false };

        function onMove(e){
            const rect = canvas.getBoundingClientRect();
            mouse.x = (e.clientX - rect.left);
            mouse.y = (e.clientY - rect.top);
            mouse.active = true;
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseleave', () => { mouse.active = false; });

        let lastT = performance.now();
        let lastDraw = 0; // 30 FPS cap
        function tick(t){
            // Limit to ~30 FPS for smoother performance on laptops
            if (t - lastDraw < 33) { requestAnimationFrame(tick); return; }
            lastDraw = t;
            const dt = Math.min(33, t - lastT); // cap delta
            lastT = t;
            ctx.clearRect(0,0,width,height);

            // Optional global fade (disabled for performance)
            // ctx.fillStyle = 'rgba(10,10,10,0.03)';
            // ctx.fillRect(0,0,width,height);

            // Update + draw particles
            for (let p of particles){
                // Mild attraction to mouse
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const d2 = dx*dx + dy*dy;
                const d = Math.sqrt(d2) || 1;
                const influence = mouse.active ? Math.min(0.10, 24/d2) : 0.012;
                p.vx += (dx/d) * influence;
                p.vy += (dy/d) * influence;

                // Move
                p.x += p.vx * (dt/16);
                p.y += p.vy * (dt/16);
                // Friction
                p.vx *= 0.970;
                p.vy *= 0.970;
                // Wrap edges
                if (p.x < -10) p.x = width+10; else if (p.x > width+10) p.x = -10;
                if (p.y < -10) p.y = height+10; else if (p.y > height+10) p.y = -10;

                // Node
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                ctx.fillStyle = `rgba(${pr},${pg},${pb},0.6)`;
                ctx.fill();
            }

            // Links
            for (let i=0;i<particles.length;i++){
                const a = particles[i];
                for (let j=i+1;j<particles.length;j++){
                    const b = particles[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const d = Math.hypot(dx,dy);
                    if (d < linkDist){
                        let alpha = (1 - d/linkDist) * 0.4;
                        // Boost near mouse
                        const mdx = (a.x+b.x)/2 - mouse.x;
                        const mdy = (a.y+b.y)/2 - mouse.y;
                        const md = Math.hypot(mdx, mdy);
                        alpha += Math.max(0, 0.1 - md/900);
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
            if (mouse.active){
                const maxR = Math.max(420, Math.min(560, Math.sqrt(width*height)*0.18));
                const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, maxR);
                grad.addColorStop(0.0, `rgba(${pr},${pg},${pb},0.08)`);
                grad.addColorStop(0.35, `rgba(${pr},${pg},${pb},0.01)`);
                grad.addColorStop(1.0, 'rgba(0,0,0,0)');
                // Clip to a region to avoid full-canvas overdraw
                ctx.save();
                ctx.beginPath();
                ctx.arc(mouse.x, mouse.y, maxR, 0, Math.PI*2);
                ctx.clip();
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = grad;
                ctx.fillRect(mouse.x - maxR, mouse.y - maxR, maxR*2, maxR*2);
                ctx.restore();
            }

            // Ripple effect removed per request

            if (!prefersReducedMotion) requestAnimationFrame(tick);
        }

        if (!prefersReducedMotion) requestAnimationFrame(tick);
    })();
    // Internationalization (EN/FR)
    const i18n = {
        en: {
            'page.title': "Victor's Portfolio",
            'nav.home': 'Home',
            'nav.about': 'About',
            'nav.publications': 'Publications',
            'nav.projects': 'Projects',
            'nav.contact': 'Contact',
            'hero.title': "<span class=\"highlight\">Victor Livernoche</span> | Ph.D. Student at Mila",
            'hero.subtitle': "I’m Victor, a Montreal-born Ph.D. student at McGill University and Mila, supervised by Prof. Reihaneh Rabbany. Outside of research, I enjoy working out, playing sports, and making music. Academically, my work centers on generative modeling, anomaly and deepfake detection, and temporal graph learning. I’m especially interested in how large-scale generative systems can be used more efficiently, and how we can design models and datasets that make AI more trustworthy and socially impactful.",
            'hero.cv': 'Download CV',
            'hero.contact': 'Contact Me',
            'hero.img_alt': 'Portrait of Victor Livernoche',
            'about.title': 'About Me',
            'about.education': 'Education',
            'edu.phd_title': 'Ph.D., Computer Science',
            'edu.phd_meta': 'McGill University • Sept 2024 – Aug 2028 • GPA: 4.0/4.0',
            'edu.phd_desc': 'Machine learning research supervised by Prof. Reihaneh Rabbany.',
            'edu.msc_title': 'M.Sc. (Thesis), Computer Science',
            'edu.msc_meta': 'McGill University • Sept 2022 – Aug 2024 • GPA: 4.0/4.0',
            'edu.msc_desc': 'Machine learning research supervised by Prof. Siamak Ravanbakhsh.',
            'edu.msc_thesis': 'Thesis',
            'edu.bsc_title': 'B.Sc., Honours Computer Science (Physics minor)',
            'edu.bsc_meta': 'McGill University • Sept 2019 – May 2022 • GPA: 3.89/4.0',
            'about.experience': 'Experience',
            'exp.mila_student_title': 'Research Scientist Student',
            'exp.mila_student_meta': 'Mila – Quebec AI Institute, Montréal • Sept 2022 – Present',
            'exp.mila_student_desc': 'Focused on diffusion models and anomaly detection; developed a new anomaly detection method based on diffusion models. Applied models to galactic star anomalies. Member of Mila’s Mental Health Committee.',
            'exp.mila_intern_title': 'Research Intern',
            'exp.mila_intern_meta': 'Mila – Quebec AI Institute, Montréal • May 2022 – Aug 2022',
            'exp.mila_intern_desc': 'Parametrized the BabyAI reinforcement learning environment in Prof. Yoshua Bengio’s group.',
            'exp.ugra_title': 'Undergraduate Research Assistant',
            'exp.ugra_meta': 'McGill University, Montréal • May 2021 – Jun 2021',
            'exp.ugra_desc': 'Analyzed data compaction methods in large databases (with Prof. Oana Balmau).',
            'exp.tech3_title': 'Research Intern',
            'exp.tech3_meta': 'Tech3Lab, HEC Montréal • May 2019 – Aug 2019',
            'exp.tech3_desc': 'Supported research operations (admin tasks, simulations, funding processes, partner communications) with Prof. Pierre‑Majorique Léger.',
            'about.interests': 'Research Interests',
            'interests.1': 'Generative modeling for images and multimodal generation',
            'interests.2': 'Energy‑based generative models (theory and applications)',
            'interests.3': 'Anomaly detection and deepfake detection against misinformation',
            'interests.4': 'Temporal graph representation learning',
            'about.skills': 'Skills',
            'skills.dl': 'Deep Learning',
            'skills.diffusion': 'Diffusion Models',
            'skills.temporal': 'Temporal Graphs',
            'skills.python': 'Python',
            'skills.pytorch': 'Pytorch',
            'pubs.title': 'Publications',
            'pubs.openfake_meta': 'Under review • Submitted to NeurIPS Datasets & Benchmarks 2025',
            'pubs.openfake_abs': 'OpenFake is a politically focused benchmark for modern deepfake detection. It pairs ~3M real images with captions and 963k high‑quality synthetic images from proprietary and open‑source generators, maps misinformation modalities seen on social media, and includes a human‑perception study showing recent proprietary models are hard to distinguish. A crowdsourced adversarial platform continually adds challenging fakes to keep detectors robust.',
            'pubs.preprint': 'Preprint',
            'pubs.paper': 'Paper',
            'pubs.diffusion_meta': 'ICLR 2024 • Spotlight (Top 5%)',
            'pubs.diffusion_abs': 'This work explores using diffusion models for anomaly detection in unsupervised and semi-supervised settings. It introduces Diffusion Time Estimation (DTE), a simplified and efficient alternative to DDPM that estimates a diffusion-time density to score anomalies. DTE performs faster than DDPM and achieves top results on ADBench, showing diffusion-based methods are competitive and scalable.',
            'pubs.prompt_meta': 'ML Reproducibility Challenge 2022 • ReScience C 9.2 (#33) • 2023',
            'pubs.prompt_abs': 'We reproduce and extend AMuLaP, a method for automatic label prompting in few-shot classification. We confirm the original results on 3 GLUE tasks and test on 2 new datasets. Despite some setup friction, the approach is reproducible, efficient, and shows promise for broader real-world NLP applications.',
            'projects.title': 'Other Projects',
            'projects.code': 'Code',
            'projects.demo': 'Demo',
            'projects.nnfs.title': 'Neural Network from Scratch',
            'projects.nnfs.desc': 'A Jupyter notebook implementing a neural network from scratch using NumPy.',
            'projects.upcoming.title': 'Upcoming',
            'projects.upcoming.desc': '...',
            'projects.mldash.title': 'ML Research Dashboard',
            'projects.mldash.desc': 'Interactive dashboard for visualizing machine learning experiments and temporal graph research results.',
            'contact.title': 'Get In Touch',
            'contact.body': "I'm always interested in discussing research opportunities, collaborations, or innovative projects in machine learning.",
            'contact.send': 'Send Email',
            'contact.cv': 'Download CV',
            'footer.copy': '© 2025 Victor. All rights reserved.'
        },
        fr: {
            'page.title': 'Portfolio de Victor',
            'nav.home': 'Accueil',
            'nav.about': 'À propos',
            'nav.publications': 'Publications',
            'nav.projects': 'Projets',
            'nav.contact': 'Contact',
            'hero.title': "<span class=\"highlight\">Victor Livernoche</span> | Doctorant à Mila",
            'hero.subtitle': "Mon nom est Victor, doctorant né à Montréal à l’Université McGill et à Mila, sous la supervision de la professeure Reihaneh Rabbany. En dehors de mes recherches, j’aime faire du sport, m’entraîner et créer de la musique. Sur le plan académique, mes travaux portent sur la modélisation générative, la détection d’anomalies et de deepfakes, ainsi que l’apprentissage sur graphes temporels. Je m’intéresse particulièrement à l'amélioration de l'efficacité des systèmes génératifs à grande échelle et à la conception de modèles et de jeux de données qui rendent l’IA plus fiable et socialement bénéfique.",
            'hero.cv': 'Télécharger le CV',
            'hero.contact': 'Contactez‑moi',
            'hero.img_alt': 'Portrait de Victor Livernoche',
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
            'interests.3': 'Détection d’anomalies et de deepfakes contre la désinformation',
            'interests.4': 'Apprentissage de représentations sur graphes temporels',
            'about.skills': 'Compétences',
            'skills.dl': 'Apprentissage profond',
            'skills.diffusion': 'Modèles de diffusion',
            'skills.temporal': 'Graphes temporels',
            'skills.python': 'Python',
            'skills.pytorch': 'PyTorch',
            'pubs.title': 'Publications',
            'pubs.openfake_meta': 'En évaluation • Soumis à NeurIPS Datasets & Benchmarks 2025',
            'pubs.openfake_abs': "OpenFake est un benchmark axé sur le politique pour la détection de deepfakes modernes. Il associe ~3 M d’images réelles avec légendes à 963 k d’images synthétiques de haute qualité issues de générateurs propriétaires et open source, cartographie les modalités de désinformation observées sur les réseaux sociaux et inclut une étude de perception montrant que les modèles propriétaires récents sont difficiles à distinguer. Une plateforme participative adversariale ajoute en continu des cas difficiles pour maintenir la robustesse des détecteurs.",
            'pubs.preprint': 'Prépublication',
            'pubs.paper': 'Article',
            'pubs.diffusion_meta': 'ICLR 2024 • Spotlight (Top 5%)',
            'pubs.diffusion_abs': "Ce travail explore l'utilisation des modèles de diffusion pour la détection d’anomalies en mode non supervisé et semi-supervisé. Il introduit une alternative plus simple et rapide au DDPM, appelée estimation du temps de diffusion (DTE), qui estime une densité temporelle pour scorer les anomalies. DTE est plus rapide que DDPM et atteint les meilleurs résultats sur ADBench, montrant que les méthodes de diffusion sont compétitives et évolutives.",
            'pubs.prompt_meta': 'ML Reproducibility Challenge 2022 • ReScience C 9.2 (#33) • 2023',
            'pubs.prompt_abs': "Nous reproduisons et étendons AMuLaP, une méthode de labellisation automatique pour la classification en few-shot. Nous validons les résultats originaux sur 3 tâches GLUE et testons sur 2 nouveaux jeux de données. Malgré certaines difficultés techniques, la méthode est reproductible, efficace et prometteuse pour des applications NLP plus larges.",
            'projects.title': 'Autres projets',
            'projects.code': 'Code',
            'projects.demo': 'Démo',
            'projects.nnfs.title': 'Réseau de neurones from scratch',
            'projects.nnfs.desc': 'Notebook Jupyter implémentant un réseau de neurones from scratch avec NumPy.',
            'projects.upcoming.title': 'À venir',
            'projects.upcoming.desc': '...',
            'projects.mldash.title': 'Tableau de bord de recherche ML',
            'projects.mldash.desc': 'Tableau de bord interactif pour visualiser des expériences d’apprentissage automatique et des résultats sur graphes temporels.',
            'contact.title': 'Me contacter',
            'contact.body': "Je suis toujours ouvert à discuter d'opportunités de recherche, de collaborations ou de projets innovants en apprentissage automatique.",
            'contact.send': 'Envoyer un e‑mail',
            'contact.cv': 'Télécharger le CV',
            'footer.copy': '© 2025 Victor. Tous droits réservés.'
        }
    };

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
        link.addEventListener('click', function(e) {
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

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            navbar.style.background = 'rgba(10, 10, 10, 0.95)';
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
        } else {
            navbar.style.background = 'rgba(10, 10, 10, 0.9)';
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

    const observer = new IntersectionObserver(function(entries) {
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
        button.addEventListener('click', function() {
            // Track contact button clicks for analytics
            console.log('Contact button clicked');
        });
    });

    // CV download tracking
    const cvButtons = document.querySelectorAll('a[href="/cv"]');
    cvButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Track CV downloads for analytics
            console.log('CV download initiated');
        });
    });

    // Add loading state to buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
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
    window.addEventListener('scroll', function() {
        const scrolled = window.pageYOffset;
        const background = document.querySelector('.animated-background');
        const rate = scrolled * -0.5;
        
        background.style.transform = `translateY(${rate}px)`;
    });

    // Mobile menu toggle (if needed)
    function createMobileMenu() {
        const nav = document.querySelector('.nav-container');
        const navLinks = document.querySelector('.nav-links');
        
        // Check if mobile menu button already exists
        if (document.querySelector('.mobile-menu-btn')) return;
        
        const mobileMenuBtn = document.createElement('button');
        mobileMenuBtn.className = 'mobile-menu-btn';
        mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        mobileMenuBtn.style.cssText = `
            display: none;
            background: none;
            border: none;
            color: var(--text-primary);
            font-size: 1.5rem;
            cursor: pointer;
        `;
        
        nav.appendChild(mobileMenuBtn);
        
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            const icon = this.querySelector('i');
            icon.className = navLinks.classList.contains('active') ? 'fas fa-times' : 'fas fa-bars';
        });
        
        // Show mobile menu button on small screens
        function checkScreenSize() {
            if (window.innerWidth <= 768) {
                mobileMenuBtn.style.display = 'block';
                navLinks.style.cssText = `
                    position: absolute;
                    top: 100%;
                    left: 0;
                    width: 100%;
                    background: rgba(10, 10, 10, 0.95);
                    flex-direction: column;
                    padding: 1rem;
                    border-top: 1px solid var(--border-color);
                    transform: translateY(-100%);
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                `;
            } else {
                mobileMenuBtn.style.display = 'none';
                navLinks.style.cssText = '';
                navLinks.classList.remove('active');
            }
        }
        
        window.addEventListener('resize', checkScreenSize);
        checkScreenSize();
    }
    
    createMobileMenu();
});

// Add CSS for mobile menu active state
const style = document.createElement('style');
style.textContent = `
    .nav-links.active {
        transform: translateY(0) !important;
        opacity: 1 !important;
        visibility: visible !important;
    }
    
    .nav-links a.active {
        color: var(--primary-color) !important;
    }
    
    .nav-links a.active::after {
        width: 100% !important;
    }
`;
document.head.appendChild(style);
