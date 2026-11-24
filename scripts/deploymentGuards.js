const fs = require("fs");
const path = require("path");

/**
 * Fail-closed artifact collision guard for OXENIQ deployments.
 * Aborts immediately before any transaction if either:
 * 1. The complete deployment artifact (<network>.json) already exists.
 * 2. The partial recovery artifact (<network>.partial.json) already exists.
 * 
 * Prevents accidental overwrite of existing contracts and duplicate minting.
 *
 * @param {string} deploymentsDir - Absolute path to the deployments directory.
 * @param {string} networkName - Name of the active network (e.g., 'bscTestnet').
 * @returns {{ outputPath: string, partialPath: string }} Verified artifact file paths.
 */
function assertNoArtifactCollision(deploymentsDir, networkName) {
  const outputPath = path.join(deploymentsDir, `${networkName}.json`);
  const partialPath = path.join(deploymentsDir, `${networkName}.partial.json`);

  if (fs.existsSync(outputPath)) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Deployment artifact already exists at '${outputPath}'. Redeployment is blocked to prevent accidental overwriting. If redeployment is truly intended, manually archive or remove the existing artifact first.`
    );
  }

  if (fs.existsSync(partialPath)) {
    throw new Error(
      `CRITICAL SAFETY ABORT: Partial deployment recovery artifact already exists at '${partialPath}'. A previous deployment failed mid-run. Redeployment is blocked to prevent duplicate token contracts and fragmented supply. Review '${partialPath}' or archive it before proceeding.`
    );
  }

  return { outputPath, partialPath };
}

module.exports = {
  assertNoArtifactCollision,
};
