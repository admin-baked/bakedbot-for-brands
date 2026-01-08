
try {
    const { Gauntlet } = require('../src/server/agents/verification/gauntlet');
    const { DeeboEvaluator } = require('../src/server/agents/verification/evaluators/deebo-evaluator');
    console.log("Imports successful");
} catch (e) {
    console.error("Import failed:", e);
}
