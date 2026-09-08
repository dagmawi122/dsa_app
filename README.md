### DSA

DSA competition platform

The app owns the problem model, test cases, Monaco editor, Judge0 integration,
and submission history. It does not import or override LMS code.

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app dsa
```

Judge0 defaults to the public CE instance. For a private Judge0 deployment, add
this to your site's `site_config.json`:

```json
{
  "judge0_url": "https://judge0.example.com"
}
```

After installation, create `DSAProblem` records in Desk and open **Practice
Problems** from the Apps screen. The editor supports C++ (Judge0 ID 54),
Python 3 (71), JavaScript (63), and Java (62).

### Practice topics

System Managers can create reusable records in **DSA Topic**, then open each
**DSAProblem** and assign one or more entries in its **Topics** field. Existing
problems remain untagged until an administrator categorizes them.

The Apps screen opens `/app/list-problems`. Learners can select several topics to
show problems matching **any** selected topic; clearing the selection shows all
problems, including untagged ones. Selecting a problem opens its description and
editor at `/app/dsa-practice/<slug>`, for example `/app/dsa-practice/two-sums`.
**Back to problems** returns to the list without clearing its filters. Opening
`/app/dsa-practice` without a problem redirects to the list. Each problem gets a
unique saved slug; duplicate titles receive numbered suffixes, and title edits
preserve existing links. The page heading includes the current problem title. The
**Topics** control in the description reveals that problem's assigned topics.
Contest problem selection continues to use the contest's own problem list.

The DSA sidebar lists **Practice Problems** under **Pages** as the learner entry point.
**Manage Problems** (`/app/dsaproblem`) opens the authoring list. The student
practice list has no creation or management controls. It supports text search,
difficulty filtering, and selecting multiple topics. Inside a problem, expanding
**Topics** shows links below the label; selecting one opens
`/app/list-problems?topic=<topic>` with that topic selected. Learners can then
add more topics or clear the filter.

Practice problem routes fill the viewport without the Desk sidebar or header.
The **Problem list** button at the top returns to `/app/list-problems`, restoring
the normal Desk layout. Both pages and the Monaco editor follow Frappe's active
theme, including automatic OS theme changes when Frappe is in automatic mode.

After updating the app, run `bench --site <site> migrate` to create the topic
DocTypes and field, then `bench build --app dsa` to rebuild the interface.

Each language has two fields on a problem:

- **Starter Code** is shown in Monaco and edited by the learner.
- **Wrapper Code** is hidden. It contains imports, input parsing, the call to
  the learner's function, and output printing. Put `{{USER_CODE}}` exactly where
  the visible editor code must be inserted.

For example, a C++ wrapper can start with its includes, insert the learner's
class, and then provide `main`:

```cpp
#include <bits/stdc++.h>
using namespace std;

{{USER_CODE}}

int main() {
    int a, b;
    cin >> a >> b;
    Solution solution;
    cout << solution.addNumbers(a, b);
}
```

If Wrapper Code is blank, the learner's editor content is submitted unchanged.
This supports older problems whose starter code is already a complete program.
Wrapper code is never returned to the browser; Run and Submit combine it with
the learner's code on the server immediately before creating Judge0 submissions.

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/dsa
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### CI

This app can use GitHub Actions for CI. The following workflows are configured:

- CI: Installs this app and runs unit tests on every push to `develop` branch.
- Linters: Runs [Frappe Semgrep Rules](https://github.com/frappe/semgrep-rules) and [pip-audit](https://pypi.org/project/pip-audit/) on every pull request.

### License

MIT
