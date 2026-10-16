/* Compatibility command; implementation lives in scripts/verify. */
require('./verify-browser.cjs').main(['recessed-bay']).catch(e=>{console.error(e);process.exitCode=1;});
