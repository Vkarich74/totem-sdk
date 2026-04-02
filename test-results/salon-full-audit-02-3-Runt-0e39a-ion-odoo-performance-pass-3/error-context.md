# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: salon-full-audit.spec.cjs >> 02.3 Runtime / chain / contract / navigation / odoo / performance pass 3
- Location: tests\salon-full-audit.spec.cjs:635:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.evaluate: Test timeout of 30000ms exceeded.
```

# Test source

```ts
  650 |           consoleErrors.push(msg.text());
  651 |         }
  652 |       });
  653 | 
  654 |       page.on('requestfailed', (req) => {
  655 |         requestFails.push({
  656 |           url: req.url(),
  657 |           method: req.method(),
  658 |           failure: req.failure() ? req.failure().errorText : 'unknown'
  659 |         });
  660 |       });
  661 | 
  662 |       page.on('response', async (res) => {
  663 |         const url = res.url();
  664 |         const headers = res.headers();
  665 |         const contentType = String(headers['content-type'] || headers['Content-Type'] || '');
  666 | 
  667 |         const shouldTrack = isLikelyApiUrl(url) || contentType.includes('application/json');
  668 |         if (!shouldTrack) return;
  669 | 
  670 |         let jsonPayload = null;
  671 |         let jsonReadable = false;
  672 |         let empty = false;
  673 |         let suspect = false;
  674 |         let payloadReason = 'non_json';
  675 | 
  676 |         if (contentType.includes('application/json') || isLikelyApiUrl(url)) {
  677 |           try {
  678 |             jsonPayload = await res.json();
  679 |             jsonReadable = true;
  680 |             const inspection = summarizePayload(jsonPayload);
  681 |             empty = inspection.empty;
  682 |             suspect = inspection.suspect;
  683 |             payloadReason = inspection.reason;
  684 |           } catch {
  685 |             payloadReason = 'unreadable_json';
  686 |           }
  687 |         }
  688 | 
  689 |         responseMeta.push({
  690 |           url,
  691 |           status: res.status(),
  692 |           ok: res.ok(),
  693 |           jsonReadable,
  694 |           jsonPayload,
  695 |           empty,
  696 |           suspect,
  697 |           payloadReason
  698 |         });
  699 |       });
  700 | 
  701 |       await page.goto(routeUrl, { waitUntil: 'domcontentloaded' });
  702 |       await page.waitForLoadState('networkidle').catch(() => {});
  703 |       await page.waitForTimeout(1500);
  704 | 
  705 |       const bodyText = await page.locator('body').innerText();
  706 |       const bodyLower = bodyText.toLowerCase();
  707 |       const uiOk = bodyText.trim().length > 50 && !hasCrashMarkers(bodyText);
  708 |       const expectedBlockHits = pageModel.expectedBlocks.filter((block) => bodyLower.includes(block.toLowerCase()));
  709 |       const expectedBlocksOk = pageModel.expectedBlocks.length === 0 ? true : expectedBlockHits.length > 0;
  710 | 
  711 |       const resourceEntries = await page.evaluate(() => {
  712 |         return performance.getEntriesByType('resource').map((entry) => ({
  713 |           name: entry.name,
  714 |           duration: Math.round(entry.duration || 0)
  715 |         }));
  716 |       });
  717 | 
  718 |       const apiResponses = responseMeta.filter((item) => isLikelyApiUrl(item.url));
  719 |       const matchedResponses = pageModel.endpoints.length > 0
  720 |         ? apiResponses.filter((meta) => pageModel.endpoints.some((endpoint) => endpointMatch(endpoint, meta.url)))
  721 |         : apiResponses;
  722 | 
  723 |       const matchedResourceEntries = resourceEntries.filter((entry) => {
  724 |         if (!isLikelyApiUrl(entry.name)) return false;
  725 |         if (pageModel.endpoints.length === 0) return true;
  726 |         return pageModel.endpoints.some((endpoint) => endpointMatch(endpoint, entry.name));
  727 |       });
  728 | 
  729 |       const apiCalled = matchedResponses.length > 0;
  730 |       const apiOk = matchedResponses.length > 0 ? matchedResponses.every((meta) => meta.status < 400) : pageModel.endpoints.length === 0;
  731 |       const apiReadable = matchedResponses.length > 0 ? matchedResponses.some((meta) => meta.jsonReadable) : pageModel.endpoints.length === 0;
  732 | 
  733 |       const contractChecks = [];
  734 |       if (pageModel.requiredFields.length > 0 && matchedResponses.length > 0) {
  735 |         for (const response of matchedResponses) {
  736 |           if (response.jsonPayload && typeof response.jsonPayload === 'object') {
  737 |             const missing = pageModel.requiredFields.filter((field) => !(field in response.jsonPayload));
  738 |             contractChecks.push({
  739 |               url: response.url,
  740 |               missing
  741 |             });
  742 |           }
  743 |         }
  744 |       }
  745 | 
  746 |       const contractOk = contractChecks.every((item) => item.missing.length === 0);
  747 |       const emptyResponses = matchedResponses.filter((meta) => meta.empty);
  748 |       const suspectResponses = matchedResponses.filter((meta) => meta.suspect);
  749 | 
> 750 |       const runtimeWindow = await page.evaluate(() => {
      |                                        ^ Error: page.evaluate: Test timeout of 30000ms exceeded.
  751 |         return {
  752 |           windowSalonSlug: typeof window.SALON_SLUG === 'undefined' ? null : window.SALON_SLUG,
  753 |           hash: window.location.hash,
  754 |           href: window.location.href,
  755 |           title: document.title || ''
  756 |         };
  757 |       });
  758 | 
  759 |       const apiSlugs = matchedResponses
  760 |         .map((meta) => {
  761 |           const match = meta.url.match(/\/salons\/([^/?#]+)/);
  762 |           return match ? match[1] : null;
  763 |         })
  764 |         .filter(Boolean);
  765 | 
  766 |       const routeSlugOk = runtimeWindow.hash.includes(`/salon/${DEFAULT_SALON_SLUG}/${pageModel.route}`);
  767 |       const injectedSlugOk = runtimeWindow.windowSalonSlug == null || runtimeWindow.windowSalonSlug === DEFAULT_SALON_SLUG;
  768 |       const apiSlugOk = apiSlugs.length === 0 || apiSlugs.every((slug) => slug === DEFAULT_SALON_SLUG);
  769 |       const slugMismatch = !(routeSlugOk && injectedSlugOk && apiSlugOk);
  770 | 
  771 |       const routeTime = Date.now() - startedAt;
  772 | 
  773 |       results.pageRuntime.push({
  774 |         run: runIndex,
  775 |         route: pageModel.route,
  776 |         url: routeUrl,
  777 |         uiOk,
  778 |         expectedBlocksOk,
  779 |         expectedBlockHits,
  780 |         renderTime: routeTime,
  781 |         consoleErrors,
  782 |         requestFails,
  783 |         apiCalled,
  784 |         apiOk,
  785 |         apiReadable,
  786 |         contractOk,
  787 |         emptyResponseCount: emptyResponses.length,
  788 |         suspectResponseCount: suspectResponses.length,
  789 |         slugMismatch,
  790 |         windowSalonSlug: runtimeWindow.windowSalonSlug,
  791 |         apiSlugs,
  792 |         hash: runtimeWindow.hash
  793 |       });
  794 | 
  795 |       results.dataContracts.push({
  796 |         run: runIndex,
  797 |         route: pageModel.route,
  798 |         requiredFields: pageModel.requiredFields,
  799 |         contractOk,
  800 |         checks: contractChecks
  801 |       });
  802 | 
  803 |       results.odooBridge.runtimeChecks.push({
  804 |         run: runIndex,
  805 |         route: pageModel.route,
  806 |         windowSalonSlug: runtimeWindow.windowSalonSlug,
  807 |         hash: runtimeWindow.hash,
  808 |         injectOk: runtimeWindow.windowSalonSlug == null || runtimeWindow.windowSalonSlug === DEFAULT_SALON_SLUG,
  809 |         routeSlugOk
  810 |       });
  811 | 
  812 |       results.slugAudit.apiSlugHits.push({
  813 |         run: runIndex,
  814 |         route: pageModel.route,
  815 |         apiSlugs
  816 |       });
  817 | 
  818 |       if (slugMismatch) {
  819 |         results.slugAudit.mismatches.push({
  820 |           run: runIndex,
  821 |           route: pageModel.route,
  822 |           windowSalonSlug: runtimeWindow.windowSalonSlug,
  823 |           apiSlugs,
  824 |           hash: runtimeWindow.hash
  825 |         });
  826 |       }
  827 | 
  828 |       results.navigation.push({
  829 |         run: runIndex,
  830 |         route: pageModel.route,
  831 |         url: routeUrl,
  832 |         slugPersistOk: routeSlugOk,
  833 |         foreignRouteLeak: runtimeWindow.hash.includes('/master/') || runtimeWindow.hash.includes('/owner/')
  834 |       });
  835 | 
  836 |       if (routeLooksLikeFinance(pageModel.route)) {
  837 |         results.financeChain.push({
  838 |           run: runIndex,
  839 |           route: pageModel.route,
  840 |           apiCalled,
  841 |           apiOk,
  842 |           contractOk,
  843 |           emptyResponseCount: emptyResponses.length,
  844 |           suspectResponseCount: suspectResponses.length
  845 |         });
  846 |       }
  847 | 
  848 |       results.performance.pageRuns.push({
  849 |         run: runIndex,
  850 |         route: pageModel.route,
```