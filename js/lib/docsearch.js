const searchClient = algoliasearch('OB36AQU7BK', '0b4b496d02c45ba125a56e9a83b58b20');

const search = instantsearch({
  indexName: 'rspamd',
  searchClient,
});

search.addWidgets([
  instantsearch.widgets.searchBox({
    container: '#docsearch',
  }),

  instantsearch.widgets.hits({
    container: '#hits',
  })
]);

search.start();