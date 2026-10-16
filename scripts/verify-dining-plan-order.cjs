/* Compatibility command; implementation lives in scripts/verify. */
require('./verify-browser.cjs').main(['dining-plan-order']).catch(e=>{console.error(e);process.exitCode=1;});
