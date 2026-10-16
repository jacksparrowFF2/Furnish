/* Compatibility command; implementation lives in scripts/verify. */
require('./verify-browser.cjs').main(['cut-board-motion']).catch(e=>{console.error(e);process.exitCode=1;});
