/* Compatibility command; implementation lives in scripts/verify. */
require('./verify-browser.cjs').main(['furniture-recovery']).catch(e=>{console.error(e);process.exitCode=1;});
