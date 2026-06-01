# Repository Instructions

- Do not hard-wrap prose in Markdown files. Leave paragraphs as single logical lines and rely on editors/viewers to soft-wrap them.

## Documentation Coordination

If changes here affect run instructions, startup flags, config files, defaults, UI/settings labels, client commands, interfaces, or HTTP/websocket behavior, check whether [`tinkertanker/miningbots`](https://github.com/tinkertanker/miningbots) docs also need updating, especially `docs/trainers/first-run-docker.md` and `docs/trainers/aws-ubuntu-native-setup.md`.

If the `miningbots` working tree is available, update the docs in the same change. If not, ask the human operator for its path; if they cannot provide access, offer a prompt for another agent to make the doc update separately.
