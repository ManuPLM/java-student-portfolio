# Group Diary — Four-Student Portfolio Starter

A Spring Boot + Thymeleaf school portfolio designed to feel like a chaotic, hand-drawn student diary: ruled notebook pages, a blue notebook cover, red margins, doodled stick figures, mock-confidential labels, scribbled captions, and a clickable 3D cover animation.

## Requirements
- Java 23
- Maven 3.6+
- Internet connection on first run if you want the Google Fonts to load (the site still works without them)

## Run locally
From this folder, run:

```bash
mvn spring-boot:run
```

Then open http://localhost:8080.

## Customize the cover
Open `src/main/resources/templates/index.html`. Edit these two strings when your group is ready:
- `[YOUR GROUP TITLE GOES HERE]`
- `[Your subtitle goes here — edit me!]`

The cover is intentionally a placeholder. The cover fills the book and opens to the introduction page. Click that page to turn to the index, then click a member to turn to that portfolio within the same book. The Previous page, Back to index, and Next page controls keep navigation inside the book. Press Escape to close the cover. You can also go directly to `http://localhost:8080/?open=true` to open the book at the index.

## Customize member pages
Edit `src/main/resources/templates/members/member1.html` through `member4.html`. Replace the bracketed prompts with each student's real name, introduction, skills, projects, and fun facts. The four pages are separate so group members can edit their own content independently.

## Main files
- `src/main/java/com/portfolio/PortfolioApplication.java` — app entry point
- `src/main/java/com/portfolio/controller/PortfolioController.java` — routes `/`, `/member/1` … `/member/4`
- `src/main/resources/templates/index.html` — cover and table of contents
- `src/main/resources/templates/members/` — four member templates
- `src/main/resources/static/css/wimpy-style.css` — visual design and responsive layout
- `src/main/resources/static/js/book-flip.js` — cover animation, page turns, and keyboard behavior

## Notes
- Doodles are made with CSS/HTML, so the starter does not need external image files.
- The design takes inspiration from the diary-comic format and hand-drawn school-notebook aesthetic, while using original generic doodles rather than copied book illustrations.
- Member names shown in the contents are placeholders and should be updated to match the four member pages.
