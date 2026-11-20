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

Then open http://localhost:8081.

## Enable Member 4's YouTube music player
The player reads both public playlists with YouTube Data API v3 and plays selections with the YouTube IFrame Player API. It needs a Google API key:

1. In Google Cloud Console, create a project, enable **YouTube Data API v3**, and create an API key.
2. Restrict the key to **YouTube Data API v3**. Under application restrictions, choose **Websites** and allow the local and deployed referrers, for example:
   - `http://localhost:8081/*`
   - `https://your-domain.example/*`
   - `https://www.your-domain.example/*` (if that hostname is used)
3. Set the key as an environment variable before starting the app. In PowerShell:

   ```powershell
   $env:YOUTUBE_API_KEY = "your-key"
   mvn spring-boot:run
   ```

   In Bash:

   ```bash
   export YOUTUBE_API_KEY="your-key"
   mvn spring-boot:run
   ```

The key is rendered to the browser because the playlist requests come from the browser; it is not a secret. Do not commit it. The API and referrer restrictions are important both locally and on the deployed site. Configure the same environment variable in your deployment platform and allow its exact HTTPS hostname(s).

To try it, open `/member/4` or the notebook at `/?open=true`, navigate to Member 4's **On repeat** card, and choose a random song. Playback does not start until the card is clicked.

## Customize the cover
Open `src/main/resources/templates/index.html`. Edit these two strings when your group is ready:
- `[YOUR GROUP TITLE GOES HERE]`
- `[Your subtitle goes here — edit me!]`

The cover is intentionally a placeholder. The cover fills the book and opens to the introduction page. Click that page to turn to the index, then click a member to turn to that portfolio within the same book. The Previous page, Back to index, and Next page controls keep navigation inside the book. Press Escape to close the cover. You can also go directly to `http://localhost:8080/?open=true` to open the book at the index.

## Customize member pages
Edit `src/main/resources/templates/members/member1.html` through `member4.html`. Replace the bracketed prompts with each student's real name, introduction, skills, projects, and fun facts. The four pages are separate so group members can edit their own content independently.

Each notebook page and standalone member page gets an enlarged, zoomable preview automatically. For additional pages, keep the page content inside a `.paper-page` element (or use `.member-paper` for a standalone member page) and include `page-preview.css` and `book-flip.js` in the template head.

## Main files
- `src/main/java/com/portfolio/PortfolioApplication.java` — app entry point
- `src/main/java/com/portfolio/controller/PortfolioController.java` — routes `/`, `/member/1` … `/member/4`
- `src/main/resources/templates/index.html` — cover and table of contents
- `src/main/resources/templates/members/` — four member templates
- `src/main/resources/static/css/wimpy-style.css` — visual design and responsive layout
- `src/main/resources/static/css/page-preview.css` — page fitting and enlarged preview styles
- `src/main/resources/static/js/book-flip.js` — cover animation, page turns, and keyboard behavior

## Notes
- Doodles are made with CSS/HTML, so the starter does not need external image files.
- The design takes inspiration from the diary-comic format and hand-drawn school-notebook aesthetic, while using original generic doodles rather than copied book illustrations.
- Member names shown in the contents are placeholders and should be updated to match the four member pages.
