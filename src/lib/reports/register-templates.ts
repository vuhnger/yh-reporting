import { registerTemplate } from "./template-registry";
import { noiseTemplate } from "./templates/noise";

// Register all report templates.
// Import this module for side-effect in the app entry point (e.g. page.tsx).
registerTemplate(noiseTemplate);
