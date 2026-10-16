/* Compatibility command; implementation lives in scripts/verify. */
require('./verify-browser.cjs').main(['beam-roof']).catch(e=>{console.error(e);process.exitCode=1;});
