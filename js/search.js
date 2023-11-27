/* global algoliasearch, instantsearch */

(() => {
    "use strict";

    const algoliaClient = algoliasearch("OB36AQU7BK", "0b4b496d02c45ba125a56e9a83b58b20");

    const searchClient = {
        ...algoliaClient,
        search(requests) {
            // Avoid empty queries
            if (requests.every(({params}) => !params.query)) {
                return Promise.resolve({
                    results: requests.map(() => ({
                        exhaustiveNbHits: false,
                        hits: [],
                        hitsPerPage: 0,
                        nbHits: 0,
                        nbPages: 0,
                        page: 0,
                        params: "",
                        processingTimeMS: 0,
                        query: "",
                    })),
                });
            }

            return algoliaClient.search(requests);
        },
    };

    const search = instantsearch({
        indexName: "rspamd",
        searchClient,
    });

    const {configure, hits, panel, searchBox} = instantsearch.widgets;

    const pagination = panel({
        hidden: ({state, results}) => state.query.length === 0 || results.nbPages < 2,
    })(instantsearch.widgets.pagination);

    search.addWidgets([
        configure({
            hitsPerPage: 8,
            restrictSearchableAttributes: [
                "content"
            ],
        }),

        searchBox({
            container: "#searchbox",
            placeholder: "Search for ...",
            templates: {
                loadingIndicator(_, {html}) {
                    return html`
                        <svg width="16" height="16" viewBox="0 0 38 38"
                            xmlns="http://www.w3.org/2000/svg" stroke="#444" class="ais-SearchBox-loadingIcon">
                            <g fill="none" fillRule="evenodd">
                                <g transform="translate(1 1)" strokeWidth="2">
                                    <circle strokeOpacity=".5" cx="18" cy="18" r="18" />
                                    <path d="M36 18c0-9.94-8.06-18-18-18">
                                        <animateTransform
                                            attributeName="transform"
                                            type="rotate"
                                            from="0 18 18"
                                            to="360 18 18"
                                            dur="1s"
                                            repeatCount="indefinite"
                                        />
                                    </path>
                                </g>
                            </g>
                        </svg>
                    `;
                },
            },
        }),

        pagination({
            container: "#pagination",
        }),

        hits({
            container: "#hits",
            templates: {
                empty() { /* Hide "No results" message */ },
                item(hit, {html, components}) {
                    /* eslint-disable new-cap */
                    return html`
                        <div>
                            <p><a href="${hit.url}">${hit.url}</a></p>
                            ${components.Highlight({attribute: "content", hit})}
                        </div>
                    `;
                    /* eslint-enable */
                },
            },
        }),
    ]);

    search.start();
})();
