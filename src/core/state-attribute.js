/**
 * Attribute on `<html>` that lists the ids of the rules in force on the
 * current page. The content script writes it, the stylesheets read it: a
 * site's stylesheet does nothing until one of its rules is named there.
 */
export const STATE_ATTRIBUTE = 'data-kill-the-feed';
