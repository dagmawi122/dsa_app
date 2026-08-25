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

After installation, create `DSAProblem` records in Desk and open **DSA
Practice** from the Apps screen. The current editor supports C++ (Judge0
language ID 54).

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
