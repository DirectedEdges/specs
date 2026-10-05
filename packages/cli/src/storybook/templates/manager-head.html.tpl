<script>
  // Browser-tab title: "<workspace> - <react|wc> - <component>".
  // Storybook's own title ("Story ⋅ Component ⋅ Storybook") is identical
  // across workspaces' instances, so tabs are indistinguishable without this.
  (function () {
    var WORKSPACE = '{{WORKSPACE_NAME}}';
    var index = null;

    function entryId() {
      var m = /[?&]path=\/(?:story|docs)\/([^&]*)/.exec(window.location.search);
      return m ? decodeURIComponent(m[1]) : null;
    }

    function compute() {
      var id = entryId();
      if (!id || !index) return null;
      var entry = index[id];
      if (!entry) return null;
      var parts = String(entry.title).split('/');
      var top = parts.shift();
      var kind = /^web ?components$/i.test(top) ? 'wc'
        : /^components$/i.test(top) ? 'react'
        : top;
      return WORKSPACE + ' - ' + kind + ' - ' + (parts.join('/') || entry.name);
    }

    function apply() {
      var title = compute();
      if (!title) return;
      if (document.title !== title) document.title = title;
    }

    fetch('./index.json')
      .then(function (r) { return r.json(); })
      .then(function (json) { index = json.entries || {}; apply(); })
      .catch(function () {});

    // Storybook rewrites the title on every navigation; reapply on top of it.
    new MutationObserver(apply).observe(document.head, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    window.addEventListener('popstate', apply);
    window.addEventListener('hashchange', apply);
  })();
</script>
