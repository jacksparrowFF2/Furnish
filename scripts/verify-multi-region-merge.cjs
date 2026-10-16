/* Compatibility command; implementation lives in scripts/verify. */
require('./verify-browser.cjs').main(['multi-region-merge']).catch(e=>{console.error(e);process.exitCode=1;});
