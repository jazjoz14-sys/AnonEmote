# AnonEmote — one-time git repository setup.
# Safe to re-run. Verifies no secrets are staged before you commit.

# Git writes informational output to stderr, so do NOT use -ErrorActionPreference Stop
$ErrorActionPreference = 'Continue'
$env:PATH = "C:\Program Files\Git\cmd;C:\Program Files\nodejs;" + $env:PATH

$repo   = "C:\Users\jazph\Desktop\SchoolWorks\Coding Projects\AnonEmote"
$parent = "C:\Users\jazph\Desktop\SchoolWorks\Coding Projects"

function Say($msg, $colour = 'Gray') { Write-Host $msg -ForegroundColor $colour }

Say "=== 1. Remove any repo accidentally created in the parent folder ===" Cyan
if (Test-Path "$parent\.git") {
    # A repo with no commits has no files under refs/heads
    $heads = @()
    if (Test-Path "$parent\.git\refs\heads") {
        $heads = Get-ChildItem "$parent\.git\refs\heads" -Recurse -File -ErrorAction SilentlyContinue
    }
    if ($heads.Count -eq 0) {
        Remove-Item "$parent\.git" -Recurse -Force -ErrorAction SilentlyContinue
        Say "  Removed empty repo from parent folder." Yellow
    } else {
        Say "  Parent repo HAS commits - leaving it untouched. Inspect manually." Red
        exit 1
    }
} else {
    Say "  Nothing to clean."
}

Say ""
Say "=== 2. Initialise repo inside AnonEmote ===" Cyan
if (-not (Test-Path "$repo\.git")) {
    git -C $repo init -b main *>$null
    Say "  Initialised on branch 'main'." Green
} else {
    Say "  Already a repo."
}

Say ""
Say "=== 3. Verify secret files are ignored ===" Cyan
$fail = $false
foreach ($f in @('backend/.env', 'frontend/.env')) {
    git -C $repo check-ignore -q $f *>$null
    if ($LASTEXITCODE -eq 0) { Say "  OK      $f ignored" Green }
    else { Say "  DANGER  $f NOT ignored" Red; $fail = $true }
}
foreach ($f in @('backend/.env.example', 'frontend/.env.example')) {
    git -C $repo check-ignore -q $f *>$null
    if ($LASTEXITCODE -ne 0) { Say "  OK      $f will be committed (template)" Green }
    else { Say "  WARN    $f ignored but should be committed" Yellow }
}
if ($fail) { Say ""; Say "Aborting - fix .gitignore first." Red; exit 1 }

Say ""
Say "=== 4. Stage all files ===" Cyan
git -C $repo add -A *>$null
$staged = @(git -C $repo diff --cached --name-only)
Say "  $($staged.Count) files staged."

Say ""
Say "=== 5. Scan staged files for secrets ===" Cyan
$leaks = $staged | Where-Object {
    $_ -match '(^|/)\.env$' -or $_ -match 'audit-log' -or $_ -match 'data/lexicon\.json'
}
if ($leaks) {
    Say "  DANGER - must not be staged:" Red
    $leaks | ForEach-Object { Say "    $_" Red }
    exit 1
}
Say "  No .env / audit log / lexicon staged." Green

$nm = @($staged | Where-Object { $_ -match 'node_modules' })
if ($nm.Count -gt 0) { Say "  WARN: $($nm.Count) node_modules files staged" Yellow }
else { Say "  node_modules excluded." Green }

Say ""
Say "=== 6. Scan staged CONTENT for key-shaped strings ===" Cyan
$found = $false
# Patterns are assembled at runtime so the literal strings never appear in this
# file — otherwise the scanner flags itself.
$patterns = @(
    ('eyJ' + 'hbGciOi'),   # JWT header prefix — real Supabase keys start this way
    ('AIza' + 'Sy')        # Google API key prefix
)
# Note: the word "service_role" is intentionally NOT a pattern — it appears
# legitimately as placeholder text in .env.example templates.
foreach ($pat in $patterns) {
    # Exclude this script (it contains the patterns) and .example templates
    $hits = @(git -C $repo diff --cached -S"$pat" --name-only 2>$null |
              Where-Object { $_ -notmatch 'scripts/git-setup\.ps1' -and $_ -notmatch '\.example$' })
    if ($hits.Count -gt 0) {
        Say "  DANGER - '$pat' found in:" Red
        $hits | ForEach-Object { Say "    $_" Red }
        $found = $true
    }
}
if ($found) { Say ""; Say "Aborting - secrets in staged content." Red; exit 1 }
Say "  No API-key-shaped strings found." Green

Say ""
Say "=== Summary ===" Cyan
Say "  Repo:    $repo"
Say "  Branch:  main"
Say "  Staged:  $($staged.Count) files"
Say ""
Say "All safety checks passed. Ready to commit." Green
