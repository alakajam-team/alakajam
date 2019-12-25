export { default as login } from "./login.po";
export { default as adminDev } from "./admin-dev.po";
export { default as post } from "./post.po";
export { default as people } from "./people.po";

export function getEditor({ index }: { index: number } = { index: 0 }) {
    return cy.get(".CodeMirror textarea").eq(index);
}

export function visitAllPages(pages: Record<string, string>) {
    Object.keys(pages).forEach((pageName) => {
        cy.visit(pages[pageName]);
    });
}

export function requestAllURLs(pages: Record<string, string>) {
    Object.keys(pages).forEach((pageName) => {
        cy.request(pages[pageName]);
    });
}
