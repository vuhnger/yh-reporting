import { registerTemplate } from "./template-registry";
import { noiseTemplate } from "./templates/noise";
import { indoorClimateTemplate } from "./templates/indoor-climate";
import { chemicalTemplate } from "./templates/chemical";
import { lightTemplate } from "./templates/light";

// Register all report templates.
// Import this module for side-effect in the app entry point (e.g. page.tsx).
registerTemplate(noiseTemplate);
registerTemplate(indoorClimateTemplate);
registerTemplate(chemicalTemplate);
registerTemplate(lightTemplate);
