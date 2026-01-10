1. The Core Application
index.html (The "Shell"):

This is the main container for your entire dashboard.

Layout: It holds the Top Bar (Status, Music Widget), the Player Columns (ALB vs BIU), and the central Tab Area.

Job: It acts as the "host" for the other tools (play.html, gen.html, etc.) which are loaded inside an <iframe>. It handles the core draft logic (drag-and-drop slots).

app.js (The "Brain"):

This file contains all the logic for index.html (since you split it recently).

Job: It handles Firebase synchronization for the scoreboard, drag-and-drop mechanics (receiving data from the Generator), Export to Showdown functionality, Settings/Config saving, and the "Live Presence" counter.

style.css (The "Look"):

This contains the specific styling for the dashboard layout defined in index.html.

Job: Controls the grid layout, column widths, header styles, and the specific look of the new "centered" layout you requested.

2. The Tab Modules (Tools)
These are the separate pages loaded into the middle tab of your dashboard:

play.html (The "Game Controller"):

Job: This is the interactive game board.

Features: It has the "Roll" buttons (Game Mode, Side Quest), the "Quick Gen" buttons (Type, Color, RNG), the Match Record tracker (the dots for BO3/BO5), and the Token Center (coin flip/counters). It syncs all these actions to Firebase so both players see the same result.

gen.html (The "Generator"):

Job: This is the Pokémon randomizer and search tool.

Features: It connects to the Pokémon Showdown database to fetch sprites and data. It allows filtering (Gen, Type, Color) and generates teams. Crucially, it makes the cards draggable so you can drag them out of this frame and drop them into the index.html slots.

music.html (The "DJ"):

Job: This handles the shared music experience.

Features: It embeds a hidden YouTube player. It manages two shared playlists, syncs the current song/timestamp/volume between users, and sends "Now Playing" data up to the index.html top bar.

history.html (The "Log"):

Job: This records past matches.

Features: It reads from the history node in Firebase to display a list of previous games, winners, scores, and replay links. It also has a manual "Add Match" modal.

3. The Shared Foundation
These files are used across multiple pages to ensure consistency:

style-global.css:

Job: Defines shared variables (colors like --accent, --bg), fonts, and common UI elements (like scrollbars and standard buttons). If you change the theme color here or via the JS, it updates every page.

global.js:

Job: Initializes Firebase (so you don't have to copy-paste the config everywhere) and handles the "Theme Sync" logic (receiving the color change from Firebase and applying it to the current page).
