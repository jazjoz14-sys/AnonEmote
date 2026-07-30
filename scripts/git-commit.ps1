# Creates the initial commit. Run scripts/git-setup.ps1 first.
$ErrorActionPreference = 'Continue'
$env:PATH = "C:\Program Files\Git\cmd;" + $env:PATH
$repo = "C:\Users\jazph\Desktop\SchoolWorks\Coding Projects\AnonEmote"

# Set identity locally for this repo only if not already configured globally
$name  = git -C $repo config user.name
$email = git -C $repo config user.email
if ([string]::IsNullOrWhiteSpace($name))  { git -C $repo config user.name  "jazph" }
if ([string]::IsNullOrWhiteSpace($email)) { git -C $repo config user.email "jazph@users.noreply.github.com" }

Write-Host "Identity: $(git -C $repo config user.name) <$(git -C $repo config user.email)>" -ForegroundColor Cyan
Write-Host ""

git -C $repo add -A

$msg = @"
Initial commit: AnonEmote 3D anonymous emotional support platform

Frontend (React + Vite + React Three Fiber):
- Navigable WebGL star system with six claymation Emotion Planets
- Procedural nebula backdrop and flicker-free starfield
- Kepler-derived orbital speeds; star-lit day/night terminator with shadows
- Two-step emotion check-in routing users to a planet and writing prompt
- Abstract avatar creator (no human traits) orbiting the selected planet
- Draggable glassmorphism panels for composing and reading posts
- Emoji-only reactions and anonymous reporting
- Admin console: activity monitoring, content review, editable lexicon

Backend (Node + Express):
- Hybrid moderation: local crisis/vernacular lexicons + Perspective API
- Crisis detection runs locally and first, so it survives API outage
- Token-based admin auth with rate limiting and timing-safe comparison
- Audit logging that never records post content

Database (Supabase):
- posts / reactions / reports with RLS and one-per-session constraints
- Trigger auto-hides a post after three distinct reports
"@

git -C $repo commit -m $msg | Out-Null

Write-Host "=== Commit created ===" -ForegroundColor Green
git -C $repo log --oneline -1
Write-Host ""
Write-Host "Files committed: $((git -C $repo ls-files | Measure-Object -Line).Lines)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Confirming no .env is tracked:" -ForegroundColor Cyan
$tracked = git -C $repo ls-files | Select-String -Pattern '\.env$' -Raw
if ($tracked) { Write-Host "  DANGER: $tracked" -ForegroundColor Red }
else { Write-Host "  Clean - no .env files tracked." -ForegroundColor Green }
