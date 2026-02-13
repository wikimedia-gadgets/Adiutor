## Adiutor

This tool helps you do common Wikipedia maintenance tasks faster. It does guided, policy-aligned workflows so that you can handle repetitive moderation and cleanup work with fewer manual steps.

Project status: actively maintained

### Basic functionality

Adiutor is intended for use by Wikipedia editors and administrators. It is meant to help editors and admins do page maintenance, deletion nominations, reporting, warning, and other anti-vandalism workflows.

Adiutor provides a gadget menu in supported skins and opens task-specific dialogs. It uses MediaWiki APIs to create edits, post notices, file requests on noticeboards, and update optional user-level settings. For more details about the technical implementation, see [the developer documentation](#developer-documentation).

### What Adiutor does not do

This tool cannot replace editorial judgment or local policy consensus. It does not have autonomous moderation, machine learning decision-making, or server-side background processing in this gadget repository.

## Prerequisites

Before using this tool, you should be familiar with:

-   the basics of Wikipedia editing policies and deletion/reporting workflows
-   JavaScript gadget usage in MediaWiki

You should have:

-   access to a MediaWiki installation with gadget support (local or remote)
-   Node.js for local development and deployment scripts
-   a user account with permissions required by each action (some features require sysop or advanced rights)

## How to use Adiutor

### Enable and open the gadget

1.  Enable Adiutor on your wiki (or load it in local development).
    1.  Ensure gadget pages are deployed (`MediaWiki:Gadget-adiutor-*.js/.json/.css`).
    2.  Ensure the Gadgets-definition line includes `Adiutor`.
    3.  Hard refresh the browser.
2.  Open a supported page (article, user page, etc.).
3.  Click the Adiutor menu in the page UI.

### Create a speedy deletion request

1.  Open a target page.
2.  From Adiutor menu, choose **Create speedy deletion request**.
    1.  Select one or more CSD reasons.
    2.  Fill extra fields (for example copyvio URL) if needed.
    3.  Optionally enable creator notification and logging.
3.  Submit and confirm the page refresh reflects the new template.

### Tag a page

1.  Open a page.
2.  From Adiutor menu, choose **Tag page**.
    1.  Select one or more maintenance tags.
    2.  Fill optional parameters where required.
3.  Submit and verify the inserted template(s) in page source/history.

### Deploy gadget changes

1.  Run the deploy script from repository root.
    1.  Provide `--api-url`, `--username`, `--password`.
    2.  Use `--only` for targeted deployments.
2.  Purge updated gadget pages.
3.  Hard refresh and retest affected workflows.

## Troubleshooting

Deploy script fails with `TypeError: ... split is not a function`

-   Use the updated script and pass flags as either `--key=value` or `--key value`.

Changes deployed but UI still shows old behavior

-   Purge the modified gadget pages and do a hard browser refresh.

Tag/CSD action fails with operation error

-   Check browser console, validate selected reasons/inputs, and verify required user rights and page protections.

## How to get help and report issues

-   Report issues at https://phabricator.wikimedia.org/tag/adiutor/
-   Ask questions or get help at https://meta.wikimedia.org/wiki/Adiutor. You can expect a response in a reasonable maintainer response window.

## Developer documentation

### Technical implementation

This tool uses MediaWiki ResourceLoader modules and the `mw.Api` client to do edit, notification, and noticeboard workflows. It depends on OOUI, MediaWiki core modules, JSON configuration files, and user global preferences because it uses configurable client-side dialogs for maintenance operations.

### Code structure

The `src/adiutor.js` module initializes options/translations and starts the launcher. The `src/adiutor-ail.js` module builds the main UI menu/router. Task modules in `src/adiutor-*.js` implement workflow-specific dialogs and API calls. JSON config in `src/adiutor-*.json` defines reasons, templates, and module options. The `scripts/` directory contains deployment and development helpers.

### Local development

#### Set up

How to set up development environment:

1.  Install prerequisites.
    1.  Install Node.js (current LTS recommended).
    2.  Ensure you have access to a MediaWiki instance for testing.

#### Install

How to install:

1.  Install repository dependencies.
    1.  `npm install`
    2.  Verify lint tooling is available (`npm run lint`).

#### Configure

How to configure:

1.  Prepare deploy credentials and target API URL.
2.  Configure gadget definition and module pages on your target wiki.

#### Build and test

How to build and run locally:

1.  Use development/deploy scripts.
    1.  Start dev helper: `npm start`
    2.  Deploy selected files: `node scripts/deploy.js --only <file1,file2>`

How to run tests:

1.  Run checks.
    1.  Lint: `npm run lint`
    2.  Run Jest tests if present: `npx jest`

#### Debugging

-   `TypeError: ... split is not a function` in deploy script
    -   Usually caused by argument parsing mismatch. Use updated `scripts/deploy.js` and valid CLI flags.

-   `operation-failed` notification after submitting a workflow
    -   Inspect browser console/network response for API errors (permissions, protected page, invalid params).

## How to contribute

The Adiutor maintainers welcome contributions.

-   bug fixes and regression fixes for workflow modules
-   localization updates, docs improvements, and test coverage improvements

### Contribution process

Before contributing, read the repository guidelines and coding conventions. We follow Wikimedia ESLint conventions in this project.

1.  Create and prepare your change.
    1.  Create a branch and implement focused edits.
    2.  Run lint/tests and verify behavior on a local wiki.

1.  Submit and iterate.
    1.  Open a merge request or share patch set with context and test notes.
    2.  Address review feedback and keep commits scoped.

## Credits

Adiutor was created and is maintained by Doğu Abaris, with contributions from Wikimedia community editors, translators, and reviewers.

## License

See [LICENSE](LICENSE).
