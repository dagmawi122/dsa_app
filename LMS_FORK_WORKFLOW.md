# LMS Fork and Team Workflow

This project uses two separate Frappe apps inside one bench:

```text
frappe-bench/
  apps/
    lms/  # official Frappe LMS repository
    dsa/  # DSA repository
```

The two folders are separate Git repositories. A branch in `apps/dsa` does not
contain or push changes from `apps/lms`.

## 1. Fork LMS on GitHub

1. Sign in to GitHub.
2. Open <https://github.com/frappe/lms>.
3. Click **Fork**.
4. Select your personal account or your team organization.
5. Keep the repository name as `lms` and create the fork.
6. Copy the fork URL. It will look like:

```text
https://github.com/YOUR_USERNAME/lms.git
```

You need write access to the fork. You do not need write access to
`frappe/lms`.

## 2. Connect the local LMS repository to your fork

The existing local LMS checkout already has the official repository as
`upstream`. Run these commands once:

```bash
cd /home/anu/frappe/frappe-bench/apps/lms

git remote -v
git remote add origin https://github.com/YOUR_USERNAME/lms.git
git remote -v
```

The expected result is:

```text
origin   https://github.com/YOUR_USERNAME/lms.git
upstream https://github.com/frappe/lms
```

If `origin` already exists, update it instead of adding it again:

```bash
git remote set-url origin https://github.com/YOUR_USERNAME/lms.git
```

## 3. Put LMS changes on the feature branch

First check the current state:

```bash
cd /home/anu/frappe/frappe-bench/apps/lms
git status --short --branch
git branch --show-current
git log -1 --oneline
```

### If the changes are already committed

The current LMS work is already committed on:

```text
feat/multi-selectional
```

The commit is:

```text
0d534fb feat: integrate DSA multi-selection
```

Do not stash or pop anything. Push that branch to your fork:

```bash
git push -u origin feat/multi-selectional
```

### If LMS changes are uncommitted

Save them, create the branch from the official development branch, and restore
them:

```bash
git stash push -u -m "LMS DSA integration changes"
git fetch upstream
git switch -c feat/multi-selectional upstream/develop
git stash pop
```

Then commit and push:

```bash
git add .
git commit -m "feat: integrate DSA multi-selection"
git push -u origin feat/multi-selectional
```

The `-u` option includes untracked files in the stash.

## 4. Check or restore an LMS stash

Run these commands from `apps/lms`, not from the bench root:

```bash
cd /home/anu/frappe/frappe-bench/apps/lms
git stash list
```

If a stash exists, inspect it:

```bash
git stash show --stat stash@{0}
git stash show --patch stash@{0}
```

Restore it without deleting the backup:

```bash
git stash apply stash@{0}
```

If `git stash list` prints nothing, there is no LMS stash. The changes may be
committed already, as they are in the current `feat/multi-selectional` branch.

## 5. Keep DSA changes in the DSA repository

Switch to the DSA repository separately:

```bash
cd /home/anu/frappe/frappe-bench/apps/dsa
git switch feat/multi-selectional
git status --short
```

If the DSA stash exists, inspect and restore it:

```bash
git stash list
git stash show --stat stash@{0}
git stash apply stash@{0}
```

Then review, commit, and push DSA changes:

```bash
git add .
git commit -m "feat: complete multi-selection DSA integration"
git push -u upstream feat/multi-selectional
```

Do not copy LMS source files into `apps/dsa`. The LMS branch is pushed to the
LMS fork, and the DSA branch is pushed to the DSA remote.

## 6. Share the changes with teammates

For LMS, send teammates the fork branch URL:

```text
https://github.com/YOUR_USERNAME/lms/tree/feat/multi-selectional
```

They can fetch it in their existing LMS checkout:

```bash
cd /home/anu/frappe/frappe-bench/apps/lms
git remote add teammate https://github.com/YOUR_USERNAME/lms.git
git fetch teammate
git switch -c feat/multi-selectional --track teammate/feat/multi-selectional
```

If they already have the branch locally:

```bash
git pull teammate feat/multi-selectional
```

For DSA, they use the DSA repository and its feature branch separately:

```bash
cd /home/anu/frappe/frappe-bench/apps/dsa
git fetch upstream
git switch feat/multi-selectional
git pull upstream feat/multi-selectional
```

## 7. Open pull requests

Open an LMS pull request from your fork:

```text
YOUR_USERNAME:lms:feat/multi-selectional
        -> frappe:lms:develop
```

Open the DSA pull request in the DSA repository:

```text
feat/multi-selectional -> develop
```

Review the LMS and DSA pull requests independently because they belong to
different repositories.

## Useful checks

Always run Git commands from the repository they belong to:

```bash
# LMS
cd /home/anu/frappe/frappe-bench/apps/lms
git status
git branch --show-current
git remote -v

# DSA
cd /home/anu/frappe/frappe-bench/apps/dsa
git status
git branch --show-current
git remote -v
```
