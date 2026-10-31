# Local assets

The included templates render without external images, logos, screenshots, or audio. Product names identify the recipe; this bundle contains no official brand artwork. Slack-like chrome and result cards are illustrative React components, not Slack API output.

Put approved assets in this folder and load them through Remotion's `staticFile()` with `Img` or the appropriate media component. Keep requests local for reproducible exports. Record each import in `asset-manifest.csv`, including source, rights, representation, and native dimensions.

Use local licensed fonts. Never add credentials, real Slack threads, personal avatars, browser profiles, or complete production archives. Review recordings for customer information before copying them. A silent template remains silent until you deliberately add approved audio and document its source.
