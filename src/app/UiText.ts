/** Current application copy, isolated so a future translation catalog can replace it. */
export const uiText = Object.freeze({
    canvasLabel: "EchoAtlas navigable music atlas",
    title: "EchoAtlas",
    navigationHelp: "Drag to explore · Scroll to zoom",
    closeSelection: "Close selected place",
    closeSymbol: "×",
    entityKinds: Object.freeze({
        artist: "Artist",
        album: "Album",
        track: "Track",
        label: "Label",
        playlist: "Playlist",
        genre: "Genre",
        compilation: "Compilation",
    }),
    fields: Object.freeze({
        country: "Country",
        formed: "Active since",
        year: "Year",
        duration: "Duration",
        trackNumber: "Track",
    }),
});
